import cron from "node-cron";
import { RoomBooking, RoomBookingStatus } from "../models/room-booking.model";
import {
  sendScheduledBookingCancelled,
  sendScheduledBookingWarning,
} from "../utils/send-email";

export const startBookingCron = () => {
  // Runs every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    console.log("Running booking cleanup job...");

    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const result = await RoomBooking.updateMany(
        {
          status: RoomBookingStatus.PENDING,
          createdAt: { $lte: thirtyMinutesAgo },
        },
        {
          $set: { status: RoomBookingStatus.CANCELLED },
        },
      );

      console.log(`Cancelled bookings: ${result.modifiedCount}`);
    } catch (error) {
      console.error("Cron job error:", error);
    }
  });
};

export const sendWarningCron = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("Warning email cron running...");

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    try {
      const bookings = await RoomBooking.find({
        status: RoomBookingStatus.CONFIRMED,
        checkIn: { $lte: twoHoursAgo },
        guestId: { $type: "objectId" }, // 👈 sirf valid ObjectId allow karega, null nahi
      })
        .populate("guestId", "email name")
        .populate("hotelId", "name city state supportEmail supportPhone")
        .populate("roomTypeId", "name")
        .lean();
      console.log("all bookings", bookings);
      if (bookings.length > 0) {
        for (let i = 0; i < bookings.length; i++) {
          console.log(bookings[i]);
          const guest = bookings[i].guestId as any;
          const hotel = bookings[i].hotelId as any;
          const roomType = bookings[i].roomTypeId as any;
          console.log(guest);
          sendScheduledBookingWarning(
            "../templates", // directory
            "booking-warning.html", // fileName
            process.env.EMAIL_USER!,
            guest.email,
            "Action Required: Your Check-in Time Has Passed",
            hotel.name,
            new Date().getFullYear().toString(),
            hotel.city,
            hotel.state,
            bookings[i]._id.toString(),
            guest.name,
            roomType.name,
            bookings[i].checkIn.toISOString(),
            "conciergeos@gmail.com",
            "+91 8447162049",
          );
        }
      }

      console.log(`[Warning Cron] ${bookings.length} warning emails sent`);
    } catch (error) {
      console.error("Warning cron error:", error);
    }
  });
};

export const cancelBookingCron = () => {
  cron.schedule("10 * * * *", async () => {
    console.log("Cancel booking cron running...");

    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    try {
      // 1. FIND bookings first
      const bookings = await RoomBooking.find({
        status: RoomBookingStatus.CONFIRMED,
        checkIn: { $lte: threeHoursAgo },
        guestId: { $type: "objectId" },
      })
        .populate("guestId", "email name")
        .populate("hotelId", "name city state supportEmail supportPhone")
        .populate("roomTypeId", "name")
        .lean();

      if (!bookings.length) {
        console.log("No bookings to cancel");
        return;
      }

      // 2. UPDATE
      const bookingIds = bookings.map((b) => b._id);

      await RoomBooking.updateMany(
        { _id: { $in: bookingIds } },
        { $set: { status: RoomBookingStatus.CANCELLED } },
      );

      // 3. SEND CANCEL EMAIL (🔥 use correct function)
      for (const booking of bookings) {
        const guest = booking.guestId as any;
        const hotel = booking.hotelId as any;
        const roomType = booking.roomTypeId as any;

        sendScheduledBookingCancelled(
          "../templates",
          "booking-cancelled.html",
          process.env.EMAIL_USER!,
          guest.email,
          "Booking Cancelled",
          hotel.name,
          new Date().getFullYear().toString(),
          hotel.city,
          hotel.state,
          booking._id.toString(),
          guest.name,
          roomType.name,
          booking.checkIn.toISOString(),
          hotel.supportEmail || "conciergeos@gmail.com",
          hotel.supportPhone || "+91 8447162049",
        );
      }

      console.log(`Cancelled ${bookings.length} bookings`);
    } catch (err) {
      console.error(err);
    }
  });
};
