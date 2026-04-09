import cron from "node-cron";
import { RoomBooking, RoomBookingStatus } from "../models/room-booking.model";

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
