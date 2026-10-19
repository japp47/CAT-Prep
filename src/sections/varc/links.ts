// Links the VARC timetable needs every day: kept apart from the resource list (resources.ts),
// so the plan, which runs on every page, does not pull in the whole list.
import type { Link } from "../types";

export const amz = (q: string) => "https://www.amazon.in/s?k=" + encodeURIComponent(q);
export const ggl = (q: string) => "https://www.google.com/search?q=" + encodeURIComponent(q);
export const yt = (q: string) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);

export const L = {
  crRC: "https://cracku.in/cat-reading-comprehension-questions",
  crVA: "https://cracku.in/cat-verbal-ability-questions",
  crCR: "https://cracku.in/cat-critical-reasoning-questions",
  crPJ: "https://cracku.in/cat-para-jumbles-questions",
  crPS: "https://cracku.in/cat-para-summary-questions",
  crOSO: "https://cracku.in/cat-odd-one-out-questions",
  crSI: "https://cracku.in/cat-para-completion-questions",
  crPYQ: "https://cracku.in/cat-previous-papers/",
  clPYQ: "https://www.careerlauncher.com/cat-mba/cat-question-paper/",
  crMock: "https://cracku.in/cat-mock-test",
  clMock: "https://www.careerlauncher.com/cat-mba/freecatmock/",
  iim: "https://iimcat.ac.in",
  bharath: "https://online.2iim.com/cat-exam/blogs/category/cat-reading-list/",
  gejo: "https://insideiim.com/free-online-varc-cat-coaching-gejo-career-launcher",
  arun: amz("How to Prepare for Verbal Ability and Reading Comprehension for CAT Arun Sharma Meenakshi Upadhyay"),
  wpme: amz("Word Power Made Easy Norman Lewis"),
  etym: "https://www.etymonline.com",
  xat: "https://cracku.in/xat-previous-papers",
  lawhub: "https://www.lawhub.org/prepare-for-the-lsat/prepare-with-lawhub",
  gmat: "https://www.mba.com/exams-and-exam-prep/gmat-exam-prep/gmat-official-practice-exams-and-questions/amp",
  gre: "https://ets.org/gre/test-takers/general-test/prepare/powerprep.html",
  readList: "https://insideiim.com/amp/the-ultimate-reading-list-to-take-your-varc-prep-to-the-next-level-by-xat-99-73-iler-1"
};

/* Weekly reading rotation, indexed by day of week (0 is Sunday). */
export interface RotationDay { d: string; src: Link[]; genre: string; out: string }
export const ROTATION: RotationDay[] = [
  { d: "Sun", src: [["Bharath's Reading List", L.bharath]], genre: "Your weakest genre", out: "A two-line summary and the tone" },
  { d: "Mon", src: [["The Economist", "https://www.economist.com"], ["Project Syndicate", "https://www.project-syndicate.org"]], genre: "Economics, business", out: "A two-line summary and the tone" },
  { d: "Tue", src: [["Aeon", "https://aeon.co"], ["Psyche", "https://psyche.co"]], genre: "Philosophy, psychology", out: "The main argument and one counterargument" },
  { d: "Wed", src: [["Smithsonian", "https://www.smithsonianmag.com"], ["Knowable", "https://knowablemagazine.org"], ["Nautilus", "https://nautil.us"]], genre: "Science, ecology", out: "What each paragraph does" },
  { d: "Thu", src: [["Guardian Long Read", "https://www.theguardian.com/news/series/the-long-read"], ["Public Books", "https://www.publicbooks.org"]], genre: "Society, technology, culture", out: "The words that show the author's attitude" },
  { d: "Fri", src: [["Literary Hub", "https://lithub.com"], ["The Marginalian", "https://www.themarginalian.org"]], genre: "Literature, art", out: "A 25-word summary" },
  { d: "Sat", src: [["JSTOR Daily", "https://daily.jstor.org"], ["Stanford Encyclopedia", "https://plato.stanford.edu"], ["The Conversation", "https://theconversation.com/global"]], genre: "Academic, history", out: "Three questions an examiner could ask" }
];
export const EARLY_SRC: Link[] = [["The Hindu editorials", "https://www.thehindu.com/opinion/editorial/"], ["Indian Express Explained", "https://indianexpress.com/section/explained/"]];
