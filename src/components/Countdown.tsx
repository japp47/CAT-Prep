import { type Road } from "../data/exam";
import { diffDays, longDate, todayIso } from "../lib/date";

/** Days from today to the student's CAT. */
export const daysLeft = (road: Road, today = todayIso()) => diffDays(today, road.exam.date);

/** "Sunday, 28 November 2027", or with "Expected on" until the date is announced. */
export const examLine = (road: Road) => (road.exam.confirmed ? "" : "Expected on ") + longDate(road.exam.date) + (road.exam.confirmed ? "" : ", not announced yet");
