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

export function formatChartData(
  raw: { _id: number; online: number; walkin: number }[],
  timeframe: string,
  startTime: Date,
) {
  const lookup = new Map(raw.map((d) => [d._id, d]));

  switch (timeframe) {
    case "week": {
      const DAY_LABELS: Record<number, string> = {
        1: "Sun",
        2: "Mon",
        3: "Tue",
        4: "Wed",
        5: "Thu",
        6: "Fri",
        7: "Sat",
      };
      return Object.entries(DAY_LABELS).map(([key, label]) => {
        const d = lookup.get(Number(key));
        return { label, online: d?.online ?? 0, walkin: d?.walkin ?? 0 };
      });
    }

    case "month": {
      const startWeek = getISOWeek(startTime);
      return [1, 2, 3, 4].map((wk) => {
        const d = lookup.get(startWeek + wk - 1);
        return {
          label: `Wk ${wk}`,
          online: d?.online ?? 0,
          walkin: d?.walkin ?? 0,
        };
      });
    }

    case "year": {
      const MONTH_LABELS: Record<number, string> = {
        1: "Jan",
        2: "Feb",
        3: "Mar",
        4: "Apr",
        5: "May",
        6: "Jun",
        7: "Jul",
        8: "Aug",
        9: "Sep",
        10: "Oct",
        11: "Nov",
        12: "Dec",
      };
      return Object.entries(MONTH_LABELS).map(([key, label]) => {
        const d = lookup.get(Number(key));
        return { label, online: d?.online ?? 0, walkin: d?.walkin ?? 0 };
      });
    }

    default:
      return raw;
  }
}

// Helper — returns ISO week number for a given date
export function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
}
