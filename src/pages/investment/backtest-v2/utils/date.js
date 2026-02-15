const CN_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const parseDateUTC = (dateStr) => new Date(`${dateStr}T00:00:00Z`);
export const dateToTime = (dateStr) => parseDateUTC(dateStr).getTime();
export const timeToDateStr = (t) => new Date(t).toISOString().slice(0, 10);
export const tsToCNDateStr = (ts) => CN_DATE_FMT.format(new Date(ts));
