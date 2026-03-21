import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import { RoomBooking } from "../models/room-booking.model";
import {
  getDateRange,
  getPercentageChange,
  getPreviousDateRange,
} from "../helper/helper";
import { ServiceItem } from "../models/service-item.model";
import { Booking } from "../models/booking.model";
import { Staff } from "../models/staff.model";

export const getOverviewController = async (req: Request, res: Response) => {
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
  const data = { json: "hello" };
  return res.status(200).json({
    success: true,
    data,
  });
}

const getOverviewDataHandler = asyncHandler(getOverviewController);
const getBookingDataHandler = asyncHandler(getBookingData);

export { getOverviewDataHandler, getBookingDataHandler };
