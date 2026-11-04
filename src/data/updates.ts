/**
 * Important updates. Newest first. Edit this file to post a new update, and move CHECKED to the day you last checked
 * every entry against its official site (the page shows it).
 * status: "official" once the exam body has published it, "expected" for estimates from past years' pattern or for
 * dates only coaching sites report so far. Always link the official page.
 */

/** The day every entry was last checked against its official site. */
export const CHECKED = "2026-11-04";
import { benchmark } from "./percentiles";

const B99 = benchmark(99);

export interface Update {
  id: string;
  date: string;
  exam: "CAT" | "XAT" | "SNAP" | "NMAT" | "Other";
  status: "official" | "expected" | "tip";
  title: string;
  body: string;
  link?: [string, string];
  /** The dates the entry is about, [ISO date, what happens], shown on the page's "Coming up" strip until they pass. */
  dates?: [string, string][];
}

export const UPDATES: Update[] = [
  {
    id: "cat26-admit", date: "2026-11-04", exam: "CAT", status: "expected",
    title: "CAT 2026 admit card: now expected on 6 November",
    body: "It was due on 4 November. Several coaching sites report that IIM Indore moved it to 6 November, though we have not seen the official notice. Log in at iimcat.ac.in with your registration user ID and password; it stays available until exam day. Check your slot, centre and photo at once, and print it with a valid photo ID.",
    link: ["iimcat.ac.in", "https://iimcat.ac.in"],
    dates: [["2026-11-06", "CAT admit card"]],
  },
  {
    id: "cat26-last-days", date: "2026-11-04", exam: "CAT", status: "tip",
    title: "CAT 2026 in 25 days: what to do now",
    body: "No new topics. Two or three mocks a week on the real interface at your slot's time, each analysed the next day, the official mock once it is up, and your Error log every day. The guide has the week-by-week plan and the exam-day checklist.",
    link: ["The last 25 days", "/guides/last-25-days"],
  },
  {
    id: "cat26-exam", date: "2026-10-17", exam: "CAT", status: "official",
    title: "CAT 2026 is on Sunday 29 November 2026",
    dates: [["2026-11-29", "CAT 2026"]],
    body: "Three slots; coaching sites report exams from 8:30 am, 12:30 pm and 4:30 pm, each two hours, and your slot is on the admit card. If you are aiming for CAT 2027, keep 29 November free to attempt a paper the same day at home, then read the slot analyses.",
    link: ["iimcat.ac.in", "https://iimcat.ac.in"],
  },
  {
    id: "cat26-papers", date: "2026-10-17", exam: "CAT", status: "expected",
    title: "CAT 2026 papers and answer keys follow the exam",
    body: "Response sheets and provisional answer keys usually appear within about a week of the exam, and coaching sites post the memory-based papers within days. Add the three CAT 2026 slots to your real-paper set for the mock phase.",
    link: ["Cracku past papers", "https://cracku.in/cat-previous-papers/"],
  },
  {
    id: "cat27-date", date: "2026-10-17", exam: "CAT", status: "expected",
    title: "CAT 2027 expected on Sunday 28 November 2027",
    body: "This is Cracku's estimate from the usual last-Sunday-of-November pattern. The planner counts down to it and will move to the official date once the conducting IIM announces it, usually at the end of July.",
    link: ["iimcat.ac.in", "https://iimcat.ac.in"],
  },
  {
    id: "cat27-reg", date: "2026-10-17", exam: "CAT", status: "expected",
    title: "CAT 2027 registration likely from early August 2027",
    body: "Registration has opened in the first week of August and closed in mid-September in recent years. Keep a scanned photo, signature and category certificates ready, and register early so you get a test city you want.",
  },
  {
    id: "xat27", date: "2026-11-04", exam: "XAT", status: "official",
    title: "XAT 2027 is on Sunday 3 January 2027; register by 6 December",
    body: "XLRI's site gives the exam as 3 January 2027, 2 pm to 5 pm, with registration closing on 6 December 2026 and the admit card due on 20 December (tentative). Its verbal and decision-making sections are excellent hard practice even if you only target CAT.",
    link: ["xatonline.in", "https://xatonline.in"],
    dates: [["2026-12-06", "XAT registration closes"], ["2026-12-20", "XAT admit card"], ["2027-01-03", "XAT 2027"]],
  },
  {
    id: "snap26", date: "2026-11-04", exam: "SNAP", status: "official",
    title: "SNAP 2026: register by 25 November; tests on 13, 19 and 26 December",
    body: "Symbiosis allows up to three attempts of 60 minutes and counts the best score; admit cards come about a week before each test, and results on 12 January 2027. Speed matters more than depth, so practise short timed sets in the weeks after CAT.",
    link: ["snaptest.org", "https://www.snaptest.org/snap-important-dates"],
    dates: [["2026-11-25", "SNAP registration closes"], ["2026-12-13", "SNAP test 1"], ["2026-12-19", "SNAP test 2"], ["2026-12-26", "SNAP test 3"], ["2027-01-12", "SNAP results"]],
  },
  {
    id: "nmat26", date: "2026-11-04", exam: "NMAT", status: "expected",
    title: "NMAT 2026 tests run until about 20 December; registration has closed",
    body: "Coaching sites report the window as 2 November to 20 December 2026, with first registration extended to 31 October and retakes bookable until about 17 December. NMAT by GMAC has no negative marking; confirm your slot and retake dates on mba.com.",
    link: ["mba.com/nmat", "https://www.mba.com/exams/nmat"],
    dates: [["2026-12-20", "NMAT window ends"]],
  },
  {
    id: "varc-bench", date: "2026-10-18", exam: "CAT", status: "tip",
    title: `VARC benchmark: about ${B99.safe} scaled for 99 percentile in CAT 2025`,
    body: `The 99 percentile took a scaled ${B99.values} in CAT ${B99.years}, averaging the tables ${B99.sources} built from the results. That is roughly 15 to 17 correct with no more than 3 wrong. Progress shows the target for your own percentile, and the estimator turns a score into a percentile.`,
  },
];
