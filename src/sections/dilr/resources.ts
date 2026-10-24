import type { Category, Priority, Resource } from "../types";
import { amz } from "../varc/links";

/*
 * DILR resources (docs/research/lr.md §5 and §8). Every link was opened on 24 Oct 2026; Reddit posts were read through
 * their RSS feeds, since Reddit blocks plain requests. Ids start with "d-" so a tick here
 * never collides with a VARC resource.
 */
export const CATEGORIES: Category[] = [
  { id: "d-start", tab: "learn", n: "Start here", note: "" },
  { id: "d-books", tab: "learn", n: "Prep books", note: "One book is enough. Most toppers use a book for the basics, then move to past CAT sets." },
  { id: "d-topic", tab: "practice", n: "CAT sets by topic", note: "Past CAT sets grouped by type. Work one type at a time in the Foundation and Build phases." },
  { id: "d-sets", tab: "practice", n: "Sets with video solutions", note: "Hundreds of free sets. Read the set from the first frame, pause, solve it on a 15-minute timer, then watch only from where you got stuck." },
  { id: "d-pyq", tab: "practice", n: "CAT past papers", note: "About 125 DILR sets since 2017. CAT 2026 papers appear after the exam on 29 Nov 2026." },
  { id: "d-sect", tab: "practice", n: "Timed sections", note: "Five sets in 40 minutes is a different skill from one set at a time: reading every set first and choosing. Start one a week in the Build phase." },
  { id: "d-hard", tab: "practice", n: "Harder practice", note: "For when CAT past sets feel easy. Old IIFT papers have dense DI and LR sets close to recent CAT." },
  { id: "d-mocks", tab: "practice", n: "Mock tests", note: "From August 2027. Before that, timed past papers do the same job." },
  { id: "d-warm", tab: "practice", n: "Warm-up puzzles", note: "Grid puzzles teach the habits LR needs: place what is certain, never guess. Use them in the first weeks, untimed; toppers on Reddit say puzzle books alone did not prepare them for CAT sets." },
  { id: "d-yt", tab: "watch", n: "YouTube", note: "" },
  { id: "d-toppers", tab: "toppers", n: "How toppers prepared DILR", note: "" },
  { id: "d-strategy", tab: "toppers", n: "Strategy and analysis", note: "" },
];

export const RESOURCES: Resource[] = [];
function r(id: string, c: string, n: string, u: string, t: string, w: string, p: Priority, x?: Partial<Resource>) {
  RESOURCES.push({ id, c, n, u, t, w, p, ...x });
}

r("d-quant-basics", "d-start", "Basic essentials of LRDI", "https://www.youtube.com/playlist?list=PL1glN7tXDkWgXozb-y6VHPDjHneRmjoG-", "Free course, Quantifiers, YouTube", "Arrangements, puzzles, tables and charts from scratch. Your first two or three weeks of DILR.", "must");
r("d-rodha", "d-start", "Complete LRDI for CAT 2027", "https://www.youtube.com/playlist?list=PLG4bwc5fquzhDp8eqRym2Ma1ut10YF0Ea", "Free course, Rodha (Ravi Prakash), 85 videos", "Every LR and DI topic from scratch, made for CAT 2027 and the free basics course r/CATpreparation names most. Pick this or the Quantifiers course, not both.", "good");
r("d-pathshala", "d-start", "Complete LRDI, basics to advanced", "https://www.youtube.com/playlist?list=PLLtQdEJkug7v5-Yrwq09aMnOZz3d313qB", "Free course, MBA Pathshala, 59 videos", "A third teacher for a topic that does not click with the first two.", "opt");
r("d-cracku-strategy", "d-start", "CAT DILR preparation strategy", "https://cracku.in/cat-dilr-preparation-strategy", "Guide, Cracku", "Which topics come most, how many sets a day, and the advice not to hoard PDFs. Links to every free Cracku DILR resource.", "good");
r("d-cracku-analyse", "d-start", "How to analyse a DILR section", "https://cracku.in/how-to-analyze-cat-dilr-section", "Guide, Cracku", "What to look at after a timed section: sets picked, time per set, misread conditions.", "good");
r("d-cl-select", "d-start", "Stop solving every set", "https://www.careerlauncher.com/blogs/cat-mba/how-to-approach-cat-dilr-section/", "Guide, Career Launcher", "Why picking two or three sets beats attempting all five, and how to judge a set in the first minutes.", "good");
r("d-iquanta-select", "d-start", "How to select an easy set", "https://www.iquanta.in/blog/?p=46945", "Guide, iQuanta", "Signs of a doable set, with examples from past papers.", "opt");
r("d-iim", "d-start", "Official CAT website", "https://iimcat.ac.in", "Official", "The notification, the official mock on the real interface, and answer keys.", "must");

r("d-b-sinha", "d-books", "Logical Reasoning and Data Interpretation for CAT", amz("Logical Reasoning and Data Interpretation for CAT Nishit Sinha"), "Book. Nishit K. Sinha, Pearson", "Every LR and DI type with graded exercises. The most cited DILR book.", "must", { find: 1 });
r("d-b-arun", "d-books", "How to Prepare for Data Interpretation and Logical Reasoning for CAT", amz("How to Prepare for Data Interpretation and Logical Reasoning for CAT Arun Sharma"), "Book. Arun Sharma, McGraw Hill", "Good theory and early practice. A 99.83 percentiler found its question types dated and moved to sectionals.", "good", { find: 1 });
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

r("d-yt-cracku", "d-yt", "Cracku DILR playlist", "https://www.youtube.com/playlist?list=PLSjkMEhzZ_ieojMb6rxxP9dFBYNB7K1vk", "YouTube playlist", "CAT-level sets solved on video, several new ones a week.", "good");
r("d-yt-2iim", "d-yt", "2IIM CAT preparation", "https://www.youtube.com/2iimcat", "YouTube channel", "Past-paper DILR sets solved step by step.", "good");
r("d-yt-anastasis", "d-sets", "200 DILR sets", "https://www.youtube.com/playlist?list=PLgdxDqtv4Gt-4vXeT_OuiwJ7-jBujAEru", "YouTube playlist, Anastasis Academy (Arvind Shankar)", "Easy sets first, then harder ones. The playlist self-studiers on Reddit name most for daily practice after the basics.", "good");
r("d-yt-anastasis-exp", "d-sets", "Most expected DILR sets", "https://www.youtube.com/playlist?list=PLgdxDqtv4Gt9hpZOteOrSIU5mKzXtpghA", "YouTube playlist, Anastasis Academy, 154 sets", "Harder, CAT-style sets for when the 200 feel easy.", "opt");
r("d-yt-jab", "d-sets", "Aptitude Jab DILR playlist", "https://www.youtube.com/playlist?list=PLxht4dVcisIIGMmxx0bTZv9F68dtuD9hY", "YouTube playlist, 475 sets", "The largest free library of solved sets. Too many to finish: use it for the types you keep missing.", "good");
r("d-yt-ims", "d-sets", "Daily practice sets for logical reasoning", "https://www.youtube.com/playlist?list=PLmIyr1osvn8MVAuqC5aiZWt_EL8ldX8Pg", "YouTube playlist, IMS Uttar Pradesh, 75 sets", "One LR set a day, the series Reddit calls \"100 days of DILR\". The CAT 2023 and 2024 runs are on the same channel.", "opt");
r("d-yt-ace", "d-hard", "100 most expected DI and LR sets", "https://www.youtube.com/playlist?list=PL0NRRcddIX2etlya_Mrowxe0knBAwWofh", "YouTube playlist, ACE CAT (Arpit Soni), 100 sets", "Harder than most free sets. A CAT 2024 98.35 percentiler on Reddit used them \"for levelling up in DILR\".", "opt");
r("d-yt-elites", "d-yt", "Elite's Grid", "https://www.youtube.com/@elitesgridCAT", "YouTube channel", "Long DI playlists, for December onwards.", "opt");
r("d-yt-quant", "d-yt", "Quantifiers video resources", "https://quantifiers.in/video-resources/", "Video index", "The basics course and topic playlists in one place.", "opt");

r("d-t-dipak", "d-toppers", "How I scored 99.83 in CAT 2023", "https://dipakagrawal.substack.com/p/how-i-scored-9983-in-cat-2023-and", "Story, Dipak Agrawal", "3 out of 60 in DILR on his first mock. Then one DILR sectional a day for about three months (some 360 sets), each analysed and re-solved. His rule: two sets solved fully is about the 99th percentile.", "must");
r("d-t-ankan", "d-toppers", "99.93 in CAT 2021 without coaching", "https://insideiim.com/cat-prepare-without-coaching-cat-tips", "Story, Ankan Chakraborty, InsideIIM", "DILR was his best section (99.37). Three or four YouTube sets on every non-mock day, 74 mocks, and on the day he left a stuck set after 20 minutes and solved three others in 13.", "good");
r("d-t-reddit-600", "d-toppers", "How I scored 99 in DILR", "https://www.reddit.com/r/CATpreparation/comments/1jqb4ej/how_i_scored_99_in_dilr/", "Story, r/CATpreparation", "13 percentile in CAT 2023, 99.24 in DILR in CAT 2024. Two sets a day untimed for two months, about 600 sets in all, and 12 attempts with none wrong on the day.", "good");
r("d-t-reddit-9938", "d-toppers", "How to crack DILR: a guide from experience", "https://www.reddit.com/r/CATpreparation/comments/1d0iakz/how_to_crack_dilr_in_cat_a_guide_based_on/", "Story, r/CATpreparation, 99.38 in DILR", "Break every clue into what it fixes before reading on, list every case, and leave a set after four minutes without a way in.", "good");
r("d-t-insideiim", "d-toppers", "DI-LR tips from toppers and IIM students", "https://insideiim.com/tips-to-crack-cat-2019-di-lr-from-cat-toppers-iim-students", "Collection, InsideIIM", "Links to a dozen accounts, including Edwin Jose, 100th percentile in DILR in CAT 2015.", "opt");

r("d-s-selection", "d-strategy", "My DILR problem was set selection, not speed", "https://www.reddit.com/r/CATpreparation/comments/1x7lh5j/i_thought_my_dilr_problem_was_speed_turns_out_it/", "Post, r/CATpreparation", "Give a set two or three minutes and ask whether you have a way in. Sunk time on a stuck set costs more than slow solving.", "good");
r("d-s-reddit", "d-strategy", "r/CATpreparation", "https://www.reddit.com/r/CATpreparation/search/?q=DILR&sort=top", "Community, Reddit", "Aspirants and toppers trading DILR advice, set reviews and resource lists. Search a set type or a mock name; read the top answers, not the panic.", "opt");
r("d-s-topics", "d-strategy", "DILR topics year by year", "https://insideiim.com/amp/cat-2024-dilr-analysis-previous-year-insights", "Analysis, InsideIIM", "How often each topic came from 2017 to 2022, the source of the table on the Learn tab.", "opt");
