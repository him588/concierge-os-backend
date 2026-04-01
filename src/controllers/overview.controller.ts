import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { RoomBooking } from "../models/room-booking.model";
import { Types } from "mongoose";
import {
  formatChartData,
  getDateRange,
  getPercentageChange,
  getPreviousDateRange,
} from "../helper/helper";
import { ServiceItem } from "../models/service-item.model";
import { Booking, BookingStatus } from "../models/booking.model";
import { Staff } from "../models/staff.model";
import { HeatCell, Timeframe } from "../types/type";
import {
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfDay,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from "date-fns";

const getOverviewController = async (req: Request, res: Response) => {
  try {
    const { timeframe } = req.query;

    if (!timeframe) {
      return res.status(400).json({
        success: false,
        message: "timeframe query is required",
      });
    }

    const { startTime, endTime } = getDateRange(timeframe as string);
    const { startTime: prevStart, endTime: prevEnd } = getPreviousDateRange(
      timeframe as string,
    );
    const hotelId = "69b5a814b970ab623ecdb80c";

    // ── Current period ──────────────────────────────────────────
    const [
      totalBookings,
      currentCheckIns,
      totalServicesBooked,
      totalStaff,
      activeStaff,
      totalServices,
    ] = await Promise.all([
      RoomBooking.countDocuments({
        createdAt: { $gte: startTime, $lt: endTime },
      }),
      RoomBooking.countDocuments({
        checkIn: { $lt: endTime },
        checkOut: { $gte: startTime },
      }),
      Booking.countDocuments({ createdAt: { $gte: startTime, $lt: endTime } }),
      Staff.countDocuments({ hotelId }),
      Staff.countDocuments({ hotelId, isActive: true }),
      ServiceItem.countDocuments({ hotelId }),
    ]);

    // ── Previous period ──────────────────────────────────────────
    const [
      prevTotalBookings,
      prevCheckIns,
      prevServicesBooked,
      prevActiveStaff,
    ] = await Promise.all([
      RoomBooking.countDocuments({
        createdAt: { $gte: prevStart, $lt: prevEnd },
      }),
      RoomBooking.countDocuments({
        checkIn: { $lt: prevEnd },
        checkOut: { $gte: prevStart },
      }),
      Booking.countDocuments({ createdAt: { $gte: prevStart, $lt: prevEnd } }),
      Staff.countDocuments({ hotelId, isActive: true }),
    ]);

    return res.status(200).json({
      success: true,
      timeframe,
      totalBookings: {
        current: totalBookings,
        previous: prevTotalBookings,
        change: getPercentageChange(totalBookings, prevTotalBookings),
      },
      checkIns: {
        current: currentCheckIns,
        previous: prevCheckIns,
        change: getPercentageChange(currentCheckIns, prevCheckIns),
      },
      totalServices,
      totalServicesBooked: {
        current: totalServicesBooked,
        previous: prevServicesBooked,
        change: getPercentageChange(totalServicesBooked, prevServicesBooked),
      },
      totalStaff,
      activeStaff: {
        current: activeStaff,
        previous: prevActiveStaff,
        change: getPercentageChange(activeStaff, prevActiveStaff),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

async function getBookingData(req: Request, res: Response) {
  const hotelId = "69b5a814b970ab623ecdb80c";
  const { timeframe } = req.query;
  const { startTime, endTime } = getDateRange(timeframe as string);

  const groupStage = (() => {
    switch (timeframe) {
      case "week":
        return { $dayOfWeek: "$createdAt" }; // 1 (Sun) – 7 (Sat)
      case "month":
        return { $week: "$createdAt" }; // ISO week number
      case "year":
        return { $month: "$createdAt" }; // 1–12
      default:
        return { $dayOfWeek: "$createdAt" };
    }
  })();

  const db = await RoomBooking.aggregate([
    {
      $match: {
        $and: [
          { createdAt: { $gte: startTime } },
          { createdAt: { $lte: endTime } },
          { hotelId: new Types.ObjectId(hotelId) },
        ],
      },
    },
    {
      $group: {
        _id: groupStage,
        online: {
          $sum: {
            $cond: [{ $ifNull: ["$guestId", false] }, 1, 0],
          },
        },
        walkin: {
          $sum: {
            $cond: [{ $ifNull: ["$guestId", false] }, 0, 1],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const data = formatChartData(db, timeframe as string, startTime);
  const totalOnlineBookings = data.reduce((sum, d) => sum + d.online, 0);
  const totalWalkinBookings = data.reduce((sum, d) => sum + d.walkin, 0);

  if (totalOnlineBookings === 0 && totalWalkinBookings === 0) {
    return res.status(200).json({
      success: true,
      data: [],
    });
  }

  return res.status(200).json({
    success: true,
    data,
  });
}

function toOccupancyPercent(count: number, maxExpected: number): number {
  return Math.min(Math.round((count / maxExpected) * 100), 100);
}

function buildMatchStage(hotelId: string, from: Date, to: Date) {
  return {
    hotelId: new Types.ObjectId(hotelId),
    status: { $ne: BookingStatus.CANCELLED },
    requestedAt: { $gte: from, $lte: to },
  };
}

async function getWeekData(hotelId: string): Promise<HeatCell[]> {
  const now = new Date();
  const from = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const to = endOfWeek(now, { weekStartsOn: 1 }); // Sunday 23:59:59
  const days = eachDayOfInterval({ start: from, end: to });

  const agg = await Booking.aggregate([
    { $match: buildMatchStage(hotelId, from, endOfDay(now)) },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$requestedAt" } },
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = Object.fromEntries(agg.map((r) => [r._id, r.count]));

  return days.map((day) => ({
    label: format(day, "EEE"), // "Mon"
    sublabel: format(day, "MMM d"), // "Mar 17"
    value: toOccupancyPercent(countMap[format(day, "yyyy-MM-dd")] ?? 0, 30),
  }));
}

async function getMonthData(hotelId: string): Promise<HeatCell[]> {
  const now = new Date();
  const from = startOfMonth(now);
  const weeks = eachWeekOfInterval(
    { start: from, end: now },
    { weekStartsOn: 1 },
  );

  const agg = await Booking.aggregate([
    { $match: buildMatchStage(hotelId, from, now) },
    {
      $group: {
        _id: { $isoWeek: "$requestedAt" },
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = Object.fromEntries(agg.map((r) => [r._id, r.count]));

  return weeks.map((weekStart, i) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const isoWeek = Number(format(weekStart, "I"));

    return {
      label: `Wk ${i + 1}`,
      sublabel: `${format(weekStart, "MMM d")}–${format(weekEnd, "d")}`,
      value: toOccupancyPercent(countMap[isoWeek] ?? 0, 150),
    };
  });
}

async function getYearData(hotelId: string): Promise<HeatCell[]> {
  const now = new Date();
  const from = startOfYear(now);
  const months = eachMonthOfInterval({ start: from, end: now });

  const agg = await Booking.aggregate([
    { $match: buildMatchStage(hotelId, from, now) },
    {
      $group: {
        _id: { $month: "$requestedAt" }, // 1–12
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = Object.fromEntries(agg.map((r) => [r._id, r.count]));

  return months.map((month) => ({
    label: format(month, "MMM"),
    value: toOccupancyPercent(countMap[month.getMonth() + 1] ?? 0, 600),
  }));
}

async function getServicesData(req: Request, res: Response) {
  const hotelId = "69b5a814b970ab623ecdb80c";
  if (!hotelId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const timeframe = (req.query.timeframe as Timeframe) ?? "week";
  const validTimeframes: Timeframe[] = ["week", "month", "year"];

  if (!validTimeframes.includes(timeframe)) {
    return res.status(400).json({
      success: false,
      error: `Invalid timeframe. Must be one of: ${validTimeframes.join(", ")}`,
    });
  }

  const handlers: Record<Timeframe, () => Promise<HeatCell[]>> = {
    week: () => getWeekData(hotelId),
    month: () => getMonthData(hotelId),
    year: () => getYearData(hotelId),
  };

  const data = await handlers[timeframe]();
  return res.json({ success: true, data });
}

async function getLatestBooking(req: Request, res: Response) {
  const hotelId = "69b5a814b970ab623ecdb80c";
  const latestBooking = await RoomBooking.find({
    hotelId: new Types.ObjectId(hotelId),
  })
    .populate("guestId", "name")
    .populate("roomTypeId", "type")
    .select("guestId numberOfGuests totalAmount status roomTypeId")
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();

  return res.status(200).json({
    success: true,
    data: latestBooking,
  });
}

const getOverviewDataHandler = asyncHandler(getOverviewController);
const getBookingDataHandler = asyncHandler(getBookingData);
const getServicesDataHandler = asyncHandler(getServicesData);
const getTopBookingsHandler = asyncHandler(getLatestBooking);

export {
  getOverviewDataHandler,
  getBookingDataHandler,
  getServicesDataHandler,
  getTopBookingsHandler,
};
