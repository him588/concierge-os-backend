import jwt from "jsonwebtoken";

export function generateOtp4() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array); // secure RNG
  const num = array[0] % 1_000_000; // 0 .. 999999
  return String(num).padStart(6, "0"); // ensures 6 digits
}

export function decodeJwt(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET as string);
}

export function getDateRange(timeframe: string) {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  const day = now.getUTCDay();

  let startTime: Date;
  let endTime: Date;

  switch (timeframe) {
    case "today":
      startTime = new Date(Date.UTC(year, month, date));
      endTime = new Date(Date.UTC(year, month, date + 1));
      break;

    case "week":
      const diff = day === 0 ? -6 : 1 - day;
      startTime = new Date(Date.UTC(year, month, date + diff));
      endTime = new Date(Date.UTC(year, month, date + diff + 7));
      break;

    case "month":
      startTime = new Date(Date.UTC(year, month, 1));
      endTime = new Date(Date.UTC(year, month + 1, 1));
      break;

    case "year":
      startTime = new Date(Date.UTC(year, 0, 1));
      endTime = new Date(Date.UTC(year + 1, 0, 1));
      break;

    default:
      throw new Error("Invalid timeframe");
  }

  return { startTime, endTime };
}

// helper (add alongside your existing getDateRange)
export const getPreviousDateRange = (timeframe: string) => {
  const { startTime, endTime } = getDateRange(timeframe);
  const diff = endTime.getTime() - startTime.getTime();

  return {
    startTime: new Date(startTime.getTime() - diff),
    endTime: new Date(endTime.getTime() - diff),
  };
};

// util to calculate % change
export const getPercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};
