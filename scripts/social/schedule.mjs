// When to post: at most once per working day, at a random minute between
// 09:00 and 17:00 Amsterdam time.

import { createHash } from "node:crypto";

export const TIME_ZONE = "Europe/Amsterdam";

/** Posting window, in minutes after local midnight. */
const WINDOW_START = 9 * 60;
const WINDOW_END = 17 * 60;

const DAY = 24 * 60 * 60 * 1000;

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

/** Amsterdam calendar date and wall-clock time of an instant. */
export function localParts(instant) {
  return Object.fromEntries(
    partsFormat
      .formatToParts(instant)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)])
  );
}

/** The instant at which Amsterdam clocks show `minutes` past midnight. */
export function localTime({ year, month, day }, minutes) {
  const guess = Date.UTC(
    year,
    month - 1,
    day,
    Math.floor(minutes / 60),
    minutes % 60
  );
  const shown = localParts(new Date(guess));
  const offset =
    Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute) -
    guess;
  return new Date(guess - offset);
}

export const dateKey = ({ year, month, day }) =>
  [year, month, day].map(n => String(n).padStart(2, "0")).join("-");

export const formatTime = instant => timeFormat.format(instant);

/** Anonymous Gregorian algorithm (Meeus/Jones/Butcher), as a UTC timestamp. */
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(year, month - 1, day);
}

/** Dutch public holidays that most people have off. */
export function isDutchHoliday({ year, month, day }) {
  const date = Date.UTC(year, month - 1, day);
  const kingsDay = new Date(Date.UTC(year, 3, 27)).getUTCDay() === 0 ? 26 : 27;
  const fixed = [
    [1, 1],
    [4, kingsDay],
    [12, 25],
    [12, 26],
    // Liberation Day is only a day off once every five years.
    ...(year % 5 === 0 ? [[5, 5]] : []),
  ];
  const easter = easterSunday(year);
  // Easter Monday, Ascension Day, Whit Monday.
  const movable = [1, 39, 50].map(days => easter + days * DAY);
  return (
    fixed.some(([m, d]) => m === month && d === day) || movable.includes(date)
  );
}

export function isWorkingDay(date) {
  const weekday = new Date(
    Date.UTC(date.year, date.month - 1, date.day)
  ).getUTCDay();
  return weekday >= 1 && weekday <= 5 && !isDutchHoliday(date);
}

/**
 * The day's posting moment. Derived from the date, so every run that day
 * agrees on it, while it lands on a different minute each day.
 */
export function postingSlot(date) {
  const hash = createHash("sha256")
    .update(`talks.timdamen.io/${dateKey(date)}`)
    .digest();
  const minutes =
    WINDOW_START + (hash.readUInt32BE(0) % (WINDOW_END - WINDOW_START));
  return localTime(date, minutes);
}

/**
 * What a run at `now` should do. Runs are hourly, so a slot less than
 * `lookahead` away is waited for, and a slot a delayed run missed is caught
 * up on until the window closes.
 */
export function decide(now, { lastPostDate, lookahead = 65 * 60 * 1000 }) {
  const today = localParts(now);
  if (!isWorkingDay(today)) {
    return { action: "skip", reason: `${dateKey(today)} is not a working day` };
  }
  if (lastPostDate === dateKey(today)) {
    return { action: "skip", reason: "already posted today" };
  }
  if (now >= localTime(today, WINDOW_END)) {
    return { action: "skip", reason: "the posting window closed at 17:00" };
  }
  const slot = postingSlot(today);
  if (slot <= now) return { action: "post", slot };
  if (slot - now <= lookahead) return { action: "wait", slot };
  return {
    action: "skip",
    reason: `today's slot is ${formatTime(slot)} Amsterdam time`,
  };
}
