/**
 * Important updates. Newest first. Edit this file to post a new update.
 * status: "official" once the exam body has published it, "expected" for estimates from past years' pattern.
 * Always link the official page.
 */
export interface Update {
  id: string;
  date: string;
  exam: "CAT" | "XAT" | "SNAP" | "NMAT" | "Other";
  status: "official" | "expected" | "tip";
  title: string;
  body: string;
  link?: [string, string];
}

export const UPDATES: Update[] = [
  {
    id: "cat26-exam", date: "2026-10-17", exam: "CAT", status: "official",
    title: "CAT 2026 is on Sunday 29 November 2026",
    body: "If you are taking CAT 2026, download the admit card as soon as it is out and take the official mock on the real interface. If you are aiming for CAT 2027, keep 29 November free to attempt a paper the same day at home, then read the slot analyses.",
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
    id: "xat27", date: "2026-10-17", exam: "XAT", status: "expected",
    title: "XAT 2027 is usually in the first week of January",
    body: "XLRI runs XAT on the first Sunday of January most years, with registration open through November. Its verbal and decision-making sections are excellent hard practice even if you only target CAT.",
    link: ["xatonline.in", "https://xatonline.in"],
  },
  {
    id: "snap26", date: "2026-10-17", exam: "SNAP", status: "expected",
    title: "SNAP 2026 runs in December with three attempts",
    body: "Symbiosis allows up to three attempts and counts the best score. Speed matters more than depth, so Practice short timed sets in the weeks after CAT.",
    link: ["snaptest.org", "https://www.snaptest.org"],
  },
  {
    id: "nmat26", date: "2026-10-17", exam: "NMAT", status: "expected",
    title: "NMAT 2026 testing window runs from about October to December",
    body: "NMAT by GMAC lets you book a slot and retake it within the window. Language, quant and logical reasoning, with no negative marking.",
    link: ["mba.com/nmat", "https://www.mba.com/exams/nmat"],
  },
  {
    id: "varc-bench", date: "2026-10-17", exam: "CAT", status: "tip",
    title: "VARC benchmark: about 43 scaled for 99 percentile in CAT 2025",
    body: "Cracku's table puts 99 percentile at 42.77 and MBAKaro at 43. That is roughly 15 to 17 correct with no more than 3 wrong. The planner and progress charts use 15 to 17 as the target band.",
  },
];
