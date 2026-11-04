import type { Category, Priority, Resource } from "../types";
import { amz } from "../varc/links";
import { DI_LADDER } from "./ladder";

/*
 * DILR resources (docs/research/lr.md §5 and §8; data interpretation in docs/research/di.md §6). LR links were opened on
 * 24 Oct 2026 and DI links on 1 Nov 2026; Reddit posts were read through their RSS feeds, since Reddit blocks plain
 * requests. Ids start with "d-" so a tick here never collides with a VARC resource.
 */
export const CATEGORIES: Category[] = [
  // Learn: general first, then each half (the page's switch shows one half at a time).
  { id: "d-start", tab: "learn", n: "Start here, for both halves", note: "The official site, how to prepare the section, and how to pick sets and study a section afterwards." },
  { id: "d-lr-courses", tab: "learn", part: "lr", n: "Logical reasoning courses", note: "Pick one course and finish it; the others are for a topic that does not click." },
  { id: "d-books", tab: "learn", part: "lr", n: "Logical reasoning books", note: "One book is enough. Most toppers use a book for the basics, then move to past CAT sets." },
  { id: "d-di-start", tab: "learn", part: "di", n: "Data interpretation: start here", note: "Before your first DI set: one short course on the chart types, a few calculation tools, and two or three articles. About two weeks at 30 minutes a day." },
  { id: "d-di-books", tab: "learn", part: "di", n: "Data interpretation books", note: "If you own Sinha's combined LR and DI book, you already have its DI half; past CAT sets matter more than a second book." },
  // Practice, in the plan's phases.
  { id: "d-warm", tab: "practice", group: "foundation", n: "Warm-up puzzles", note: "Grid puzzles teach the habits LR needs: place what is certain, never guess. Use them in the first weeks, untimed; toppers on Reddit say puzzle books alone did not prepare them for CAT sets." },
  { id: "d-topic", tab: "practice", group: "foundation", n: "Logical reasoning sets by topic", note: "Past CAT sets grouped by type. Work one type at a time in the Foundation and Build phases." },
  { id: "d-di-topic", tab: "practice", group: "foundation", n: "Data interpretation sets by topic", note: "Past CAT DI sets grouped by picture, free with written and video solutions. Start with the basics page, untimed, then a 12-minute timer." },
  { id: "d-sets", tab: "practice", group: "build", n: "Sets with video solutions", note: "Hundreds of free sets. Read the set from the first frame, pause, solve it on a 15-minute timer, then watch only from where you got stuck." },
  { id: "d-di-ladder", tab: "practice", group: "build", n: "Past CAT DI sets, easiest first", note: "Twelve real CAT data sets in the order to try them: direct charts first, then two linked charts, tables with blanks, and sets that need cases. Two a week from your fourth week of DI. Each link opens the full paper on 2IIM; the set is named in the line below." },
  { id: "d-sect", tab: "practice", group: "build", n: "Timed sections", note: "Five sets in 40 minutes is a different skill from one set at a time: reading every set first and choosing. Start one a week in the Build phase." },
  { id: "d-pyq", tab: "practice", group: "build", n: "CAT past papers", note: "About 125 DILR sets since 2017. Use 2017 to 2022 for timed sections now and keep 2023 onwards for the mock phase. CAT 2026 papers appear after the exam on 29 Nov 2026." },
  { id: "d-mocks", tab: "practice", group: "mock", n: "Mock tests", note: "From August 2027. Before that, timed past papers do the same job." },
  { id: "d-hard", tab: "practice", group: "mock", n: "Harder practice", note: "For when CAT past sets feel easy. Old IIFT papers have dense DI and LR sets close to recent CAT." },
  { id: "d-yt", tab: "watch", n: "Channels for both halves", note: "Whole channels and long playlists that cover logical reasoning and data interpretation." },
  { id: "d-di-yt", tab: "watch", n: "Data interpretation, solved and taught", note: "Pick one basics course. Then watch solved sets only after trying them yourself." },
  { id: "d-toppers", tab: "toppers", n: "How toppers prepared DILR", note: "" },
  { id: "d-strategy", tab: "toppers", n: "Strategy and analysis", note: "" },
];

export const RESOURCES: Resource[] = [];
function r(id: string, c: string, n: string, u: string, t: string, w: string, p: Priority, x?: Partial<Resource>) {
  RESOURCES.push({ id, c, n, u, t, w, p, ...x });
}

r("d-quant-basics", "d-lr-courses", "Basic essentials of LRDI", "https://www.youtube.com/playlist?list=PL1glN7tXDkWgXozb-y6VHPDjHneRmjoG-", "Free course, Quantifiers, YouTube", "Arrangements, puzzles, tables and charts from scratch. Your first two or three weeks of DILR.", "must");
r("d-rodha", "d-lr-courses", "Complete LRDI for CAT 2027", "https://www.youtube.com/playlist?list=PLG4bwc5fquzhDp8eqRym2Ma1ut10YF0Ea", "Free course, Rodha (Ravi Prakash), 85 videos", "Every LR and DI topic from scratch, made for CAT 2027 and the free basics course r/CATpreparation names most. Pick this or the Quantifiers course, not both.", "good");
r("d-pathshala", "d-lr-courses", "Complete LRDI, basics to advanced", "https://www.youtube.com/playlist?list=PLLtQdEJkug7v5-Yrwq09aMnOZz3d313qB", "Free course, MBA Pathshala, 59 videos", "A third teacher for a topic that does not click with the first two.", "opt");
r("d-cracku-strategy", "d-start", "CAT DILR preparation strategy", "https://cracku.in/cat-dilr-preparation-strategy", "Guide, Cracku", "Which topics come most, how many sets a day, and the advice not to hoard PDFs. Links to every free Cracku DILR resource.", "good");
r("d-cracku-analyse", "d-start", "How to analyse a DILR section", "https://cracku.in/how-to-analyze-cat-dilr-section", "Guide, Cracku", "What to look at after a timed section: sets picked, time per set, misread conditions.", "good");
r("d-cl-select", "d-start", "Stop solving every set", "https://www.careerlauncher.com/blogs/cat-mba/how-to-approach-cat-dilr-section/", "Guide, Career Launcher", "Why picking two or three sets beats attempting all five, and how to judge a set in the first minutes.", "good");
r("d-iquanta-select", "d-start", "How to select an easy set", "https://www.iquanta.in/blog/?p=46945", "Guide, iQuanta", "Signs of a doable set, with examples from past papers.", "opt");
r("d-iim", "d-start", "Official CAT website", "https://iimcat.ac.in", "Official", "The notification, the official mock on the real interface, and answer keys.", "must");

r("d-b-sinha", "d-books", "Logical Reasoning and Data Interpretation for CAT", amz("Logical Reasoning and Data Interpretation for CAT Nishit Sinha"), "Book. Nishit K. Sinha, Pearson", "Every LR and DI type with graded exercises. The most cited DILR book. Pearson now also sells its DI half as its own book, under Data interpretation.", "must", { find: 1, alt: { l: "Preview on Google Books", u: "https://books.google.co.in/books?id=PoiqDwAAQBAJ" } });
r("d-b-arun", "d-books", "How to Prepare for Data Interpretation and Logical Reasoning for CAT", amz("How to Prepare for Data Interpretation and Logical Reasoning for CAT Arun Sharma"), "Book. Arun Sharma, McGraw Hill", "Good theory and early practice. A 99.83 percentiler found its question types dated and moved to sectionals.", "good", { find: 1 });
r("d-b-sinha-di", "d-di-books", "Data Interpretation for CAT", amz("Data Interpretation for CAT Nishit K Sinha Pearson"), "Book. Nishit K. Sinha, Pearson", "The DI half of Sinha's book on its own, with past CAT DI sets. Buy this or the combined book, not both.", "good", { find: 1 });
r("d-b-arun-di", "d-di-books", "How to Prepare for Data Interpretation for CAT", amz("How to Prepare for Data Interpretation for CAT Arun Sharma"), "Book. Arun Sharma, McGraw Hill", "Arun Sharma's DI on its own, in three levels of difficulty. Good for calculation practice if you already own his LR book.", "opt", { find: 1 });
r("d-b-time-di", "d-di-books", "Data Interpretation for the CAT", "https://books.google.co.in/books?id=jB48BAAAQBAJ", "Book preview. T.I.M.E., Pearson, 2011, Google Books", "An older book, but the free preview covers how to read each kind of chart, with worked examples. Read the preview; do not buy it for practice.", "opt");
r("d-b-summers", "d-books", "The Great Book of Puzzles and Teasers", amz("George J. Summers puzzles teasers logic"), "Book. George J. Summers", "Classic deduction puzzles. For the habit of reasoning step by step, not for CAT patterns.", "opt", { find: 1 });

r("d-pb", "d-warm", "Puzzle Baron logic grids", "https://logic.puzzlebaron.com/", "Free puzzles, online", "Einstein-style grid puzzles at every level, solved on an interactive grid.", "good");
r("d-bz", "d-warm", "Brainzilla logic puzzles", "https://www.brainzilla.com/logic/", "Free puzzles, online", "Logic grids from very easy to medium, and logic equations that mix grids with numbers.", "good");
r("d-tatham", "d-warm", "Simon Tatham's puzzle collection", "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/", "Free puzzles, browser and phone", "Towers, Keen and Solo train placing only what is certain.", "opt");
r("d-lsat", "d-warm", "LSAT logic games (old PrepTests)", "https://www.lawhub.org/prepare-for-the-lsat/prepare-with-lawhub", "Official LSAT practice, LawHub", "Ordering and grouping games from PrepTests before August 2024, when the LSAT dropped them. The cleanest grouping practice there is. Which tests are free may change.", "opt");

r("d-cr-topic", "d-topic", "Cracku DILR questions by topic", "https://cracku.in/cat-dilr-questions", "Past CAT questions, solutions", "Arrangements, Venn diagrams, truth and lie, maxima and minima and more, each with a free test.", "must");
r("d-cr-pdf", "d-topic", "CAT DILR topic-wise questions PDF", "https://cracku.in/cat-2025-dilr-topic-wise-questions-pdf/", "Free PDF, Cracku", "The same past sets as a download, for practice on paper.", "good");
r("d-cr-12", "d-topic", "12 must-solve CAT DILR sets", "https://cracku.in/cat-dilr-previous-year-sets-for-cat-2025", "12 past sets, Cracku", "A short list of past sets worth solving twice.", "good");
r("d-2iim-qb", "d-topic", "2IIM question bank", "https://iim-cat-questions-answers.2iim.com/", "CAT-level questions, no sign-up", "DI and LR questions with written solutions and many videos.", "good");
r("d-quant-sets", "d-topic", "Quantifiers condition-based sets", "https://quantifiers.in/dilr/dilr-condition-based-sets/", "Free sets", "Seating, grouping, matching, scheduling and games, at CAT level.", "good");
r("d-cr-daily", "d-topic", "Cracku daily target", "https://cracku.in/cat-daily-target/", "One set a day", "A new LR or DI set every day, for a steady habit.", "opt");

r("d-cr-pyq", "d-pyq", "Cracku CAT previous papers", "https://cracku.in/cat-previous-papers", "Every paper since 2017, solutions", "Take full DILR sections timed, slot by slot.", "must");
r("d-2iim-pyq", "d-pyq", "2IIM CAT question papers", "https://online.2iim.com/CAT-question-paper/", "PDFs 2017 to 2021, video solutions", "Papers to print, with 2IIM's solutions on YouTube.", "good");
r("d-goat-pyq", "d-pyq", "All 114 CAT DILR sets solved, 2017 to 2024", "https://www.youtube.com/playlist?list=PLXv0hNMDm8iQE7VHb7UvrwhKL_pF9C35T", "YouTube playlist, GOAT CAT, 114 videos", "One video for every past CAT set. Solve the set first, then watch only the part where you got stuck.", "good");
r("d-cl-pyq", "d-pyq", "Career Launcher past papers", "https://www.careerlauncher.com/cat-mba/cat-question-paper/", "Past papers, solutions", "A second set of solutions when one explanation does not click.", "opt");

r("d-cr-sect", "d-sect", "Cracku free LRDI sectional test", "https://cracku.in/lrdi-sectional-tests-2025/lrdi-free-sectional-test", "Free timed section, video solutions", "A full 40-minute DILR section in the CAT interface, with a percentile against other takers.", "good");
r("d-insideiim-mini", "d-sect", "InsideIIM DILR mini mocks", "https://insideiim.com/free-cat-tests-to-ace-cat-2023", "Free short tests, InsideIIM", "Short DILR tests for practising set selection in less than a full section.", "opt");
r("d-iift", "d-hard", "IIFT previous papers", "https://cracku.in/iift-previous-papers", "Papers 2008 to 2023, solutions, Cracku", "IIFT's DI and LR sets are dense and calculation-heavy. Good extra sets once CAT's are used up.", "opt");
r("d-iquanta-sets", "d-hard", "iQuanta LRDI practice sets", "https://www.iquanta.in/blog/cat-lrdi-practice-sets-part-2-download-free-pdf/", "Free PDF, 10 sets with solutions", "Ten CAT-level sets on paper, for a weekend block away from the screen.", "opt");
r("d-cr-mock", "d-mocks", "Cracku free CAT mock", "https://cracku.in/cat-mock-test", "Free mock", "A full mock with DILR at CAT level.", "good");
r("d-quant-mock", "d-mocks", "Quantifiers TruCAT", "https://quantifiers.in/cat-test-series/", "Free all-India mocks", "Free full mocks with a national comparison, from the same team as the basics course.", "good");
r("d-2iim-mock", "d-mocks", "2IIM free mocks", "https://online.2iim.com/free-cat-study-material.shtml", "3 free mocks, free sign-up", "Two past CAT papers in mock form and one XAT mock, plus a daily quiz with no sign-up.", "opt");
r("d-hbe-mock", "d-mocks", "Hitbullseye free CAT mock", "https://mba.hitbullseye.com/CAT/CAT-mock-test.php", "Free mock", "Another free mock with a detailed analysis of each section.", "opt");
r("d-cl-mock", "d-mocks", "Career Launcher free CAT mock", "https://www.careerlauncher.com/cat-mba/freecatmock/", "Free mock", "A second free mock with a percentile estimate.", "good");

r("d-di-wallah", "d-di-start", "DI tables and charts, a starter kit", "https://www.youtube.com/playlist?list=PLlxE9WKuvDj-EpQRRmi209Ht3RrDKtIa8", "Free course, MBA Wallah, YouTube, 8 videos", "Tables, pie charts, bar graphs, line graphs, word problems and two-chart sets, one video each. Watch one a day, then do the same kind of set on Cracku's basics page.", "must");
r("d-di-unacademy", "d-di-start", "Data interpretation, lesson by lesson", "https://www.youtube.com/playlist?list=PLh-uxFrOdsq9rrJS0iBTZRFn5a8WsSbvU", "Free course, Unacademy CAT (Ashish Kumar), 30 videos", "A slower, structured course: tables, then bar graphs, then pie charts, each in several levels. For a chart type that did not click in the starter kit.", "good");
r("d-di-calc", "d-di-start", "Course on calculations", "https://www.youtube.com/playlist?list=PLsUniZXPiubTbWcg5jMC4RoxlLM7rZG4A", "Free course, The Arun Sharma Academy, 7 videos", "Additions, multiplications, squares, roots, divisions and percentages done faster in your head. Most DI fear is calculation fear; this is the cure.", "good");
r("d-di-pw-tables", "d-di-start", "Tables in DI", "https://www.pw.live/mba/exams/cat-lrdi-tables", "Article, PW", "A short primer: percentage change on the right base, fraction shortcuts, missing values, and when to approximate.", "good");
r("d-di-pw-bars", "d-di-start", "Bar graphs in DI", "https://www.pw.live/mba/exams/cat-lrdi-bar-graphs", "Article, PW", "Simple, grouped and stacked bars, and the comparisons questions ask of them.", "opt");
r("d-di-pw-lines", "d-di-start", "Line graphs in DI", "https://www.pw.live/mba/exams/cat-lrdi-line-graphs", "Article, PW", "Reading trends and changes off a line, and the scale traps.", "opt");
r("d-di-pw-pies", "d-di-start", "Pie charts in DI", "https://www.pw.live/mba/exams/cat-lrdi-pie-charts", "Article, PW", "Shares, degrees and totals: turning a percentage of an unknown whole into a number.", "opt");
r("d-di-tricks", "d-di-start", "Tricks to speed up DI calculations", "https://www.pagalguy.com/articles/tricks-to-speed-up-calculations-for-data-interpretation-questions-in-cat-2011-14278", "Article, PaGaLGuY", "Fraction and percentage pairs, comparing fractions without dividing, and how far apart the options must be before you can round.", "good");
r("d-di-calculator", "d-di-start", "CAT's on-screen calculator", "https://cracku.in/cat-onscreen-calculator", "Guide, Cracku", "What the exam's basic calculator does, and when clicking it is slower than working it out. Practise with it before your first timed section.", "opt");
r("d-di-trend", "d-di-start", "What DILR asked from 2021 to 2025", "https://www.careers360.com/mba/articles/cat-dilr-5-year-trend-analysis-2021-2025-topics-sets", "Analysis, Careers360", "Why pure chart sets are fewer and data sets with rules are more, and how to log reading, calculation and reasoning time separately.", "opt");

r("d-di-cr-basics", "d-di-topic", "DI basics, past CAT sets", "https://cracku.in/cat-data-interpretation-basics-questions/", "103+ questions, Cracku", "The first stop after the starter kit: direct chart and table sets from past papers, with video solutions.", "must");
r("d-di-cr-tables", "d-di-topic", "Tables with missing values", "https://cracku.in/cat-table-based-di-sets-questions/", "79+ questions, Cracku", "The commonest DI picture in recent CAT: fill the blanks from totals and rules before answering.", "must");
r("d-di-cr-charts", "d-di-topic", "Charts", "https://cracku.in/cat-di-charts-questions/", "168+ questions, Cracku", "Bar, line and pie sets from past papers. The biggest DI bank; do the types you miss most.", "good");
r("d-di-cr-special", "d-di-topic", "Special charts", "https://cracku.in/cat-di-special-charts-questions/", "54+ questions, Cracku", "Radar, step, scatter and other unusual pictures, like CAT 2025's tariff and puzzle sets.", "good");
r("d-di-cr-change", "d-di-topic", "Data change over a period", "https://cracku.in/cat-di-data-change-over-period-questions/", "75+ questions, Cracku", "Growth, compound change and year-on-year comparisons, the calculation most DI sets lean on.", "opt");
r("d-di-cr-all", "d-di-topic", "All CAT DI questions", "https://cracku.in/cat-data-interpretation-questions", "Index, Cracku", "Links to every DI topic page and a free past-paper DI test.", "opt");

DI_LADDER.forEach(([id, n, u, t, w, pr]) => r(id, "d-di-ladder", n, u, t, w, pr));
r("d-di-yt-rodha", "d-di-yt", "Data interpretation and Venn diagrams", "https://www.youtube.com/playlist?list=PLG4bwc5fquzhzt4w7EZVc31G5VsQ4JbPo", "YouTube playlist, Rodha (Ravi Prakash), 18 videos", "Pie charts, tables, maxima and minima, from the same CAT 2027 course as Rodha's LR basics.", "good");
r("d-di-yt-cracku", "d-di-yt", "Charts-based DI workshops", "https://www.youtube.com/playlist?list=PLSjkMEhzZ_ieeTBr2dTdFt3pw2t4BqFn3", "YouTube playlist, Cracku, 11 videos", "Live chart and table sets solved by two 99.9+ percentilers, and a set-selection session. For the Build phase.", "good");
r("d-di-yt-pyq", "d-di-yt", "CAT 2024 DI past questions solved", "https://www.youtube.com/playlist?list=PLh-uxFrOdsq-68tq2V3VBuBFUaHeMZ_EN", "YouTube playlist, Unacademy CAT (Saral Nashier), 20 videos", "Recent CAT DI sets solved, then a run of the best past LRDI questions. Solve each set first.", "good");
r("d-di-yt-2iim", "d-di-yt", "Data interpretation questions, CAT and IIFT", "https://www.youtube.com/playlist?list=PL2WkReU3YCPwf2WDfswajbSk2sF6DZN89", "YouTube playlist, 2IIM, 24 videos", "Line graphs, pie charts and unusual charts, plus a talk on how to prepare for DI.", "opt");

r("d-yt-cracku", "d-yt", "Cracku DILR playlist", "https://www.youtube.com/playlist?list=PLSjkMEhzZ_ieojMb6rxxP9dFBYNB7K1vk", "YouTube playlist", "CAT-level sets solved on video, several new ones a week.", "good");
r("d-yt-2iim", "d-yt", "2IIM CAT preparation", "https://www.youtube.com/2iimcat", "YouTube channel", "Past-paper DILR sets solved step by step.", "good");
r("d-yt-anastasis", "d-sets", "200 DILR sets", "https://www.youtube.com/playlist?list=PLgdxDqtv4Gt-4vXeT_OuiwJ7-jBujAEru", "YouTube playlist, Anastasis Academy (Arvind Shankar)", "Easy sets first, then harder ones. The playlist self-studiers on Reddit name most for daily practice after the basics.", "good");
r("d-yt-anastasis-exp", "d-sets", "Most expected DILR sets", "https://www.youtube.com/playlist?list=PLgdxDqtv4Gt9hpZOteOrSIU5mKzXtpghA", "YouTube playlist, Anastasis Academy, 154 sets", "Harder, CAT-style sets for when the 200 feel easy.", "opt");
r("d-yt-jab", "d-sets", "Aptitude Jab DILR playlist", "https://www.youtube.com/playlist?list=PLxht4dVcisIIGMmxx0bTZv9F68dtuD9hY", "YouTube playlist, 475 sets", "The largest free library of solved sets. Too many to finish: use it for the types you keep missing.", "good");
r("d-yt-ims", "d-sets", "Daily practice sets for logical reasoning", "https://www.youtube.com/playlist?list=PLmIyr1osvn8MVAuqC5aiZWt_EL8ldX8Pg", "YouTube playlist, IMS Uttar Pradesh, 75 sets", "One LR set a day, the series Reddit calls \"100 days of DILR\". The CAT 2023 and 2024 runs are on the same channel.", "opt");
r("d-yt-ace", "d-hard", "100 most expected DI and LR sets", "https://www.youtube.com/playlist?list=PL0NRRcddIX2etlya_Mrowxe0knBAwWofh", "YouTube playlist, ACE CAT (Arpit Soni), 100 sets", "Harder than most free sets. A CAT 2024 98.35 percentiler on Reddit used them \"for levelling up in DILR\".", "opt");
r("d-yt-elites", "d-yt", "Elite's Grid", "https://www.youtube.com/@elitesgridCAT", "YouTube channel", "Long LR and DI playlists. Students on Reddit name it as strong for DI.", "opt");
r("d-yt-quant", "d-yt", "Quantifiers video resources", "https://quantifiers.in/video-resources/", "Video index", "The basics course and topic playlists in one place.", "opt");

r("d-t-dipak", "d-toppers", "How I scored 99.83 in CAT 2023", "https://dipakagrawal.substack.com/p/how-i-scored-9983-in-cat-2023-and", "Story, Dipak Agrawal", "3 out of 60 in DILR on his first mock. Then one DILR sectional a day for about three months (some 360 sets), each analysed and re-solved. His rule: two sets solved fully is about the 99th percentile.", "must");
r("d-t-ankan", "d-toppers", "99.93 in CAT 2021 without coaching", "https://insideiim.com/cat-prepare-without-coaching-cat-tips", "Story, Ankan Chakraborty, InsideIIM", "DILR was his best section (99.37). Three or four YouTube sets on every non-mock day, 74 mocks, and on the day he left a stuck set after 20 minutes and solved three others in 13.", "good");
r("d-t-reddit-600", "d-toppers", "How I scored 99 in DILR", "https://www.reddit.com/r/CATpreparation/comments/1jqb4ej/how_i_scored_99_in_dilr/", "Story, r/CATpreparation", "13 percentile in CAT 2023, 99.24 in DILR in CAT 2024. Two sets a day untimed for two months, about 600 sets in all, and 12 attempts with none wrong on the day.", "good");
r("d-t-reddit-9938", "d-toppers", "How to crack DILR: a guide from experience", "https://www.reddit.com/r/CATpreparation/comments/1d0iakz/how_to_crack_dilr_in_cat_a_guide_based_on/", "Story, r/CATpreparation, 99.38 in DILR", "Break every clue into what it fixes before reading on, list every case, and leave a set after four minutes without a way in.", "good");
r("d-t-insideiim", "d-toppers", "DI-LR tips from toppers and IIM students", "https://insideiim.com/tips-to-crack-cat-2019-di-lr-from-cat-toppers-iim-students", "Collection, InsideIIM", "Links to a dozen accounts, including Edwin Jose, 100th percentile in DILR in CAT 2015.", "opt");

r("d-s-selection", "d-strategy", "My DILR problem was set selection, not speed", "https://www.reddit.com/r/CATpreparation/comments/1x7lh5j/i_thought_my_dilr_problem_was_speed_turns_out_it/", "Post, r/CATpreparation", "Give a set two or three minutes and ask whether you have a way in. Sunk time on a stuck set costs more than slow solving.", "good");
r("d-s-reddit", "d-strategy", "r/CATpreparation", "https://www.reddit.com/r/CATpreparation/search/?q=DILR&sort=top", "Community, Reddit", "Aspirants and toppers trading DILR advice, set reviews and resource lists. Search a set type or a mock name; read the top answers, not the panic.", "opt");
r("d-s-topics", "d-strategy", "DILR topics year by year", "https://insideiim.com/amp/cat-2024-dilr-analysis-previous-year-insights", "Analysis, InsideIIM", "How often each topic came from 2017 to 2022, the source of the table on the Learn tab.", "opt");
