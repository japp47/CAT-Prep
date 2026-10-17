import type { Category, Link, Priority, Resource } from "../types";

const amz = (q: string) => "https://www.amazon.in/s?k=" + encodeURIComponent(q);
const ggl = (q: string) => "https://www.google.com/search?q=" + encodeURIComponent(q);
const yt = (q: string) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);

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

/* Resource categories. "tab" is the VARC page tab the category shows on. */
export const CATEGORIES: Category[] = [
  { id: "course", tab: "learn", n: "Start here", note: "" },
  { id: "books", tab: "learn", n: "Prep books", note: "One prep book is enough. Arun Sharma's covers every CAT question type in graded levels." },
  { id: "b-rc", tab: "practice", n: "Reading comprehension", note: "Cracku shows a solution on every question, but may ask you to sign in for some features. Full past papers are further down this tab." },
  { id: "b-pj", tab: "practice", n: "Para jumbles", note: "CAT gives no options for jumbles. When a bank shows options, cover them and type your order first." },
  { id: "b-ps", tab: "practice", n: "Para summary", note: "" },
  { id: "b-oso", tab: "practice", n: "Odd sentence out", note: "" },
  { id: "b-si", tab: "practice", n: "Sentence insertion", note: "Recent CAT papers ask which gap a given sentence came from. Older banks ask you to complete the paragraph instead, so use questions from 2022 on." },
  { id: "b-cr", tab: "practice", n: "Critical reasoning", note: "CAT no longer asks it, but XAT does. LSAT logical reasoning is the hardest standard practice." },
  { id: "banks", tab: "practice", n: "Mixed question banks", note: "All VA types in one place, for mixed drills once each type feels familiar." },
  { id: "pyq", tab: "practice", n: "CAT past papers", note: "CAT 2026 papers appear on these sites after the exam on 29 Nov 2026. Add them to your real-paper set." },
  { id: "hard", tab: "practice", n: "Harder practice", note: "For the Apply phase from June 2027, once CAT-level RCs feel manageable. XAT verbal is denser than CAT, and LSAT RC is the hardest standard RC there is." },
  { id: "mocks", tab: "practice", n: "Mock tests", note: "You need these from August 2027. Before that, timed past papers do the same job. Pick one series with a large test pool." },
  { id: "curators", tab: "read", n: "Curated reading", note: "Sites that pick good long reads for you, so you spend the time reading instead of searching." },
  { id: "reading", tab: "read", n: "Reading sites", note: "" },
  { id: "aeon", tab: "read", n: "Aeon essays", note: "The first two were CAT 2025 passages. Find opens a search for the title. Aeon essays run 1,500 to 3,000 words against about 500 in CAT, so read one in two sittings." },
  { id: "lit", tab: "read", n: "Books to read", note: "For the reading habit, not exam practice. One book a month on weekends is plenty. The last three are my suggestions, not from a topper's list." },
  { id: "yt", tab: "watch", n: "YouTube", note: "" },
  { id: "vocab", tab: "vocab", n: "Vocabulary", note: "" },
  { id: "toppers", tab: "toppers", n: "Topper stories and exam analysis", note: "" },
  { id: "community", tab: "toppers", n: "Communities and tools", note: "" }
];

export const RESOURCES: Resource[] = [];
function r(id: string, c: string, n: string, u: string, t: string, w: string, p: Priority, x?: Partial<Resource>) {
  RESOURCES.push({ id, c, n, u, t, w, p, ...x });
}

r("gejo", "course", "VARC masterclass by Gejo Sreenivasan", L.gejo, "Free course, 17 modules", "RC strategy, para jumbles, summaries and advanced exercises from Career Launcher's VARC mentor. Your weekend core task until it is done.", "must");
r("iim-site", "course", "Official CAT website", L.iim, "Official", "The CAT 2027 notification, registration, admit card and answer keys appear here once the conducting IIM announces them.", "must");
r("cracku-beg", "course", "RC preparation for beginners", "https://cracku.in/cat-rc-preparation-for-beginners", "Guide, Cracku", "Five stages: daily reading, summaries, easy RCs, CAT-level RCs, then timed practice. Suggests 45 to 60 minutes of reading a day.", "good");
r("2iim-95", "course", "How to cross 95 in VARC", "https://online.2iim.com/cat-exam/blogs/cat-preparation-strategy/cat-preparation-plan-how-to-cross-95-in-varc/", "Guide, 2IIM", "Read genre by genre from Bharath's list and switch genres once one feels comfortable.", "good");

r("b-arun", "books", "How to Prepare for Verbal Ability and Reading Comprehension for CAT", L.arun, "Book. Arun Sharma and Meenakshi Upadhyay, McGraw Hill", "All CAT question types, RC passages graded by difficulty, and drills for each VA type. Beginner to advanced.", "must", { find: 1 });
r("b-pearson", "books", "The Pearson Guide to Verbal Ability and Reading Comprehension for CAT", amz("Pearson Guide to Verbal Ability and Reading Comprehension for CAT Nishit Sinha"), "Book. Nishit K. Sinha, Pearson", "A wide variety of RCs and a grounding in critical reasoning. Intermediate to advanced.", "good", { find: 1 });
r("b-rc99", "books", "RC 99", amz("RC 99 Nishit Sinha"), "Book. Nishit Sinha", "RC-only practice at CAT level. Advanced.", "good", { find: 1 });
r("b-arun-pyq", "books", "Chapter-Wise Solved Previous Years' Papers for CAT", amz("Chapter-Wise Solved Previous Years Papers for CAT Arun Sharma Meenakshi Upadhyay"), "Book. Arun Sharma and Meenakshi Upadhyay", "Past papers in print by topic. The papers are free online, so this is a convenience.", "opt", { find: 1 });
r("b-ajay", "books", "Verbal Ability and Reading Comprehension", amz("Verbal Ability and Reading Comprehension for CAT Ajay Singh"), "Book. Ajay Singh", "Extra VA practice at intermediate level.", "opt", { find: 1 });
r("b-wren", "books", "High School English Grammar and Composition", amz("High School English Grammar and Composition Wren Martin"), "Book. Wren and Martin", "A grammar reference if long sentences trip you up. CAT does not test grammar directly.", "opt", { find: 1 });

r("cr-rc", "b-rc", "Cracku RC questions", L.crRC, "858+ questions, video solutions", "CAT RC passages from past papers, filterable by year back to 1990.", "must");

r("cr-pj160", "b-pj", "Cracku para jumbles", L.crPJ, "160+ questions, video solutions, free PDF", "Past-paper jumbles in the TITA format.", "must");
r("2iim-pj", "b-pj", "2IIM sentence rearrangement", "https://iim-cat-questions-answers.2iim.com/verbal/sentence-rearrangement/", "49 questions, written explanations", "Free with no login. Older MCQ format, so cover the options.", "good");
r("prep-pj", "b-pj", "Preparoo solved para jumbles", "https://mba.preparoo.app/cat/how-to-solve-parajumbles", "24 past questions, worked explanations", "CAT 2017 onwards, each solved step by step. The same page as the Learn guide.", "good");
r("bodhee-pj", "b-pj", "Bodhee Prep para jumbles", "https://bodheeprep.com/cat-parajumbles-questions-solutions-practice", "About 30 questions, answers on the page", "TITA format with solutions.", "good");
r("vh-pj", "b-pj", "Verbalhub para jumbles", "https://www.verbalhub.com/cat-parajumbles-practice-questions.php", "40 questions in 5 sets", "An answer and a short explanation for each.", "opt");

r("cr-ps", "b-ps", "Cracku para summary questions", L.crPS, "96+ questions, written and video solutions", "Past papers from 1991 to 2025.", "must");
r("prep-ps", "b-ps", "Preparoo solved para summaries", "https://mba.preparoo.app/cat/how-to-solve-para-summary", "23 past questions, worked explanations", "Explains the right option and why each other option is wrong.", "good");

r("cr-oso", "b-oso", "Cracku odd one out questions", L.crOSO, "48+ questions, solutions", "Past papers from 2017 to 2025.", "must");
r("prep-oso", "b-oso", "Preparoo solved odd one out", "https://mba.preparoo.app/cat/how-to-solve-odd-one-out", "20 past questions, worked explanations", "Each gives the odd sentence, the order of the other four and the reasoning.", "good");

r("cr-si", "b-si", "Cracku sentence placement questions", L.crSI, "27 questions, written explanations", "CAT 2022 to 2025, all in the current gap format.", "must");

r("cr-cr", "b-cr", "Cracku critical reasoning questions", L.crCR, "38+ questions, video solutions", "Assumption, strengthen and weaken practice that sharpens RC judgement.", "good");
r("cr-xatcr", "b-cr", "Cracku XAT critical reasoning PDF", "https://cracku.in/xat-2026-critical-reasoning-questions-pdf/", "PDF", "Assumption, inference, strengthen and weaken, and conclusion questions in the XAT style.", "good");
r("lsat-lr", "b-cr", "LSAT logical reasoning samples", "https://www.lawhub.org/prepare-for-the-lsat/whats-in-the-lsat/logical-reasoning-sample-questions", "10 official questions with explanations", "From LSAC. Free drill sets need a free LawHub account.", "good");
r("mr-lsat", "b-cr", "Manhattan Review LSAT questions", "https://www.manhattanreview.com/lsat-practice-questions/", "92 free questions, tagged by type", "Explanations for each. Use the logical reasoning ones.", "opt");

r("cr-va", "banks", "Cracku verbal ability questions", L.crVA, "300+ questions, video solutions", "Para jumbles, odd one out, summaries and sentence insertion.", "must");
r("gh-practice", "banks", "cat-varc-practice", "https://sujithsuresh-803.github.io/cat-varc-practice/", "Open-source practice site", "1,075 questions across RC, PJ, PS and odd sentence out, plus 13 real CAT papers from 2018 to 2022 with answer keys. No sign-up.", "good", { alt: { l: "GitHub", u: "https://github.com/sujithsuresh-803/cat-varc-practice" } });
r("cr-all", "banks", "Cracku 5000+ free CAT questions", "https://cracku.in/cat-questions", "Question bank", "All sections. Useful later for DILR and Quant too.", "opt");

r("cracku-pyq", "pyq", "Cracku CAT previous papers", L.crPYQ, "PDFs, online tests, video solutions", "Slot-wise papers as timed online tests. Papers back to 1990.", "must");
r("cl-pyq", "pyq", "Career Launcher past papers", L.clPYQ, "PDFs, written and video solutions", "Slot-wise 2017 to 2025, section-wise, free without login.", "must");
r("2iim-free", "pyq", "2IIM free CAT study material", "https://online.2iim.com/free-cat-study-material.shtml", "Solutions, videos, reading list", "Free with no signup. Past paper solutions and 1,700+ videos.", "must");
r("c360-pyq", "pyq", "Careers360 question papers", "https://bschool.careers360.com/articles/cat-question-papers", "PDF archive", "2017 to 2025 slot-wise, with section-wise VARC files for many slots.", "good");
r("selfstudys", "pyq", "SelfStudys past papers", "https://www.selfstudys.com/cat/exam/previous-year-paper/year-wise", "PDFs", "Slot-wise VARC PDFs. Papers back to 2000.", "good");
r("cd-pyq", "pyq", "Collegedunia question papers", "https://collegedunia.com/exams/cat/question-paper", "PDFs with solutions", "2020 to 2025, slot-wise.", "good");

r("xat", "hard", "XAT previous papers", L.xat, "Papers 2010 to 2025, Cracku", "The verbal and logical ability section has dense RCs and critical reasoning, harder than CAT.", "must");
r("xat26", "hard", "XAT 2026 verbal section test", "https://cracku.in/xat-previous-sectional-tests/xat-4th-jan-2026-verbal-ability-logical-reasoning", "Online sectional test", "The latest XAT verbal section as a timed test.", "good");
r("lawhub", "hard", "Official LSAT PrepTests on LawHub", L.lawhub, "Free with an account", "Full official LSAT PrepTests and free RC drill sets. The best source of very hard RC.", "must");
r("lsat-rc", "hard", "LSAT RC sample questions", "https://www.lawhub.org/prepare-for-the-lsat/whats-in-the-lsat/reading-comprehension-sample-questions", "14 questions with explanations", "Five passages including a comparative pair. Read the explanations closely.", "good");
r("gmat", "hard", "GMAT official starter kit", L.gmat, "2 practice exams, 90 questions, free", "Official verbal questions to sharpen critical reasoning and RC.", "good");
r("gre", "hard", "GRE POWERPREP tests", L.gre, "2 free tests", "Verbal reasoning with short, dense RCs. One untimed, one timed.", "good");
r("gmatclub-rc", "hard", "GMAT Club: how to read an RC passage", "https://gmatclub.com/forum/how-to-read-an-rc-passage-reading-strategies-and-practice-300892.html", "Forum guide", "Reading strategies with practice links.", "opt");

r("iim-mock", "mocks", "Official IIM CAT mock", L.iim, "Official", "The real exam interface. Usually released a few weeks before each CAT.", "must");
r("cracku-mock", "mocks", "Cracku free mocks and VARC sectional", L.crMock, "3 full mocks, 1 sectional", "Free tests with video solutions.", "must");
r("cl-mock", "mocks", "Career Launcher free mocks", L.clMock, "5 full mocks, 80+ sectionals", "Basic, advanced and expert levels.", "must");
r("ims", "mocks", "IMS SimCAT", "https://www.imsindia.com", "Paid series, 1 free test", "A large test pool, so your percentile means something. The best paid option.", "good");
r("insideiim", "mocks", "InsideIIM free daily tests", "https://insideiim.com/free-daily-mba-mock-tests-cat-xat-other-mba-exams", "Daily quizzes and sectionals", "Good for a daily VARC sectional.", "good");
r("hbb", "mocks", "Hitbullseye free mocks", "https://mba.hitbullseye.com/CAT/CAT-mock-test.php", "Free mocks, login needed", "Extra mock volume.", "good");
r("percentyl-mocks", "mocks", "Percentyl mock directory", "https://percentyl.in/resources/mocks", "Directory", "Free mocks from Cracku, iQuanta, TCY, TestFunda, CL, CATking and Hitbullseye on one page.", "good");
r("testfunda", "mocks", "TestFunda free full mock", "https://testfunda.com/blog/free-cat-2026-full-length-mock-test/", "1 full mock", "With video solutions.", "opt");

r("bharath", "curators", "Bharath's Reading List", L.bharath, "2IIM, 700+ articles in 6 genres", "Articles picked for CAT by a 99.21 VARC scorer: technology and science, psychology and philosophy, culture, politics and law, economy, fiction.", "must", { alt: { l: "About the list", u: "https://online.2iim.com/cat-exam/blogs/bharaths-curated-reading-list-for-cat-exam-2-2/" } });
r("aldaily", "curators", "Arts & Letters Daily", "https://www.aldaily.com", "Daily links and newsletter", "Essays and reviews on ideas, philosophy and culture, the kind CAT draws on.", "good");
r("browser", "curators", "The Browser", "https://thebrowser.com", "Free daily newsletter", "5 hand-picked articles every weekday.", "good");
r("longreads", "curators", "Longreads", "https://longreads.com", "Long-form essays", "Personal and reported essays and reading lists.", "opt");
r("cracku-daily", "curators", "Cracku daily articles", "https://cracku.in/cat-daily-articles", "Daily picks", "Two or three articles a day chosen for CAT.", "opt");

r("cracku-src", "reading", "Cracku: sources of CAT RC passages", "https://cracku.in/sources-of-cat-previous-year-rc-passages/", "Analysis", "Where real CAT passages came from each year. Use it to decide what to read.", "must");
r("aeon", "reading", "Aeon", "https://aeon.co", "Essays", "Philosophy, psychology and science essays built on abstract arguments.", "must");
r("economist", "reading", "The Economist", "https://www.economist.com", "Magazine", "The most frequent CAT source in 2023 and 2024. Paywalled, so use free articles or a library.", "must");
r("guardian", "reading", "The Guardian Long Read", "https://www.theguardian.com/news/series/the-long-read", "Long-form", "Technology, culture and society.", "must");
r("jstor", "reading", "JSTOR Daily", "https://daily.jstor.org", "Essays", "Academic ideas in essay form. Topper Harshit Pansari read it.", "must");
r("psyche", "reading", "Psyche", "https://psyche.co", "Essays", "Shorter psychology and philosophy essays from Aeon's sister site.", "good");
r("publicbooks", "reading", "Public Books", "https://www.publicbooks.org", "Essays", "A repeat CAT source. Humanities and social science.", "good");
r("smithsonian", "reading", "Smithsonian Magazine", "https://www.smithsonianmag.com", "Magazine", "Science, history and ecology as narrative.", "good");
r("sep", "reading", "Stanford Encyclopedia of Philosophy", "https://plato.stanford.edu", "Encyclopedia", "Dense academic prose and a CAT 2023 source. Advanced.", "good");
r("knowable", "reading", "Knowable Magazine", "https://knowablemagazine.org", "Magazine", "Science explainers. A CAT 2025 source.", "good");
r("boston", "reading", "Boston Review", "https://www.bostonreview.net", "Magazine", "Politics, environment and ideas. A CAT 2025 source.", "good");
r("conv", "reading", "The Conversation", "https://theconversation.com/global", "News site", "Academics writing for the public. A CAT 2023 source.", "good");
r("nautilus", "reading", "Nautilus", "https://nautil.us", "Magazine", "Science and philosophy.", "good");
r("projsyn", "reading", "Project Syndicate", "https://www.project-syndicate.org", "Op-eds", "Economics and policy.", "good");
r("lithub", "reading", "Literary Hub", "https://lithub.com", "Essays", "Literary criticism, which covers CAT's literature passages.", "good");
r("hindu", "reading", "The Hindu editorials", "https://www.thehindu.com/opinion/editorial/", "Newspaper", "A warm-up for the first weeks.", "good");
r("ie", "reading", "Indian Express Explained", "https://indianexpress.com/section/explained/", "Newspaper", "Clear analytical prose for the first weeks.", "good");
r("quanta", "reading", "Quanta Magazine", "https://www.quantamagazine.org", "Magazine", "Hard-science explainers.", "opt");
r("marginalian", "reading", "The Marginalian", "https://www.themarginalian.org", "Essays", "Literature, philosophy and art.", "opt");
r("scroll", "reading", "Scroll", "https://scroll.in", "News site", "Indian long-form.", "opt");
r("mint", "reading", "Livemint", "https://www.livemint.com", "Newspaper", "Indian economy and business.", "opt");
r("prospect", "reading", "Prospect Magazine", "https://www.prospectmagazine.co.uk", "Magazine", "Politics and culture. A CAT 2023 source.", "opt");

r("aeon-complex", "aeon", "Complex systems science allows us to see new paths forward", "https://aeon.co/essays/complex-systems-science-allows-us-to-see-new-paths-forward", "Essay. Jessica Flack and Melanie Mitchell", "A CAT 2025 Slot 1 passage, rated the hardest RC of that slot.", "must");
r("aeon-ethics", "aeon", "The incompleteness of ethics", "https://aeon.co/essays/what-godels-incompleteness-theorems-say-about-ai-morality", "Essay. Elad Uzan", "A CAT 2025 Slot 3 passage on AI morality.", "must");
r("aeon-golden", "aeon", "The Golden Quarter", ggl('site:aeon.co "The Golden Quarter" Michael Hanlon'), "Essay. Michael Hanlon", "Why progress stalled after 1971.", "good", { find: 1 });
r("aeon-science", "aeon", "But is it Science?", ggl('site:aeon.co "But is it Science" Jim Baggott'), "Essay. Jim Baggott", "The demarcation problem in philosophy of science.", "good", { find: 1 });
r("aeon-pvalues", "aeon", "The Problem with P-values", ggl('site:aeon.co "The Problem with P-values" David Colquhoun'), "Essay. David Colquhoun", "Statistics and reproducibility.", "good", { find: 1 });
r("aeon-family", "aeon", "Runs in the Family", ggl('site:aeon.co "Runs in the Family" David Papineau'), "Essay. David Papineau", "Heredity.", "good", { find: 1 });
r("aeon-numeracy", "aeon", "How Natural is Numeracy?", ggl('site:aeon.co "How Natural is Numeracy" Philip Ball'), "Essay. Philip Ball", "Cognition and culture.", "good", { find: 1 });
r("aeon-disgust", "aeon", "Disgust Made us Human", ggl('site:aeon.co "Disgust Made us Human" Kathleen McAuliffe'), "Essay. Kathleen McAuliffe", "Evolutionary psychology and morality.", "good", { find: 1 });
r("tetw", "aeon", "Best Aeon essays for the CAT", "https://tetw.org/Aeon", "Reading list", "A curated list by The Electric Typewriter.", "good");
r("c360-aeon", "aeon", "Aeon essays for CAT 2026, by category", "https://www.careers360.com/mba/articles/aeon-essays-for-cat-2026-complete-reading-list-varc", "Reading list", "A category-wise list from Careers360.", "good");

r("lit-list", "lit", "The ultimate reading list, by a XAT 99.73 percentile scorer", L.readList, "Article, InsideIIM", "Prep books, novels, non-fiction and magazines in one list.", "good");
r("lit-hbb", "lit", "36 must-read fiction books for CAT", "https://mba.hitbullseye.com/CAT/Fiction-Books-CAT.php", "List, Hitbullseye", "A longer fiction list.", "opt");
r("lit-1984", "lit", "1984 and Animal Farm", amz("George Orwell 1984 Animal Farm"), "Books. George Orwell", "Short, sharp, and full of argument about power and language.", "good", { find: 1 });
r("lit-zen", "lit", "Zen and the Art of Motorcycle Maintenance", amz("Zen and the Art of Motorcycle Maintenance Pirsig"), "Book. Robert M. Pirsig", "Philosophy of quality inside a road trip. Excellent for abstract argument.", "good", { find: 1 });
r("lit-hawking", "lit", "A Brief History of Time", amz("A Brief History of Time Stephen Hawking"), "Book. Stephen Hawking", "Science explained for general readers.", "good", { find: 1 });
r("lit-toffler", "lit", "Future Shock", amz("Future Shock Alvin Toffler"), "Book. Alvin Toffler", "Technology and social change.", "opt", { find: 1 });
r("lit-kite", "lit", "The Kite Runner", amz("The Kite Runner Khaled Hosseini"), "Book. Khaled Hosseini", "Narrative fiction for an easy start to the habit.", "opt", { find: 1 });
r("lit-moscow", "lit", "A Gentleman in Moscow", amz("A Gentleman in Moscow Amor Towles"), "Book. Amor Towles", "Rich literary prose.", "opt", { find: 1 });
r("lit-oldman", "lit", "The Old Man and the Sea", amz("The Old Man and the Sea Hemingway"), "Book. Ernest Hemingway", "A short classic.", "opt", { find: 1 });
r("lit-kahneman", "lit", "Thinking, Fast and Slow", amz("Thinking Fast and Slow Daniel Kahneman"), "Book. Daniel Kahneman", "Psychology and economics.", "opt", { find: 1 });
r("lit-sapiens", "lit", "Sapiens", amz("Sapiens Yuval Noah Harari"), "Book. Yuval Noah Harari", "History and anthropology.", "opt", { find: 1 });
r("lit-bryson", "lit", "A Short History of Nearly Everything", amz("A Short History of Nearly Everything Bill Bryson"), "Book. Bill Bryson", "Science history.", "opt", { find: 1 });

r("yt-2iim", "yt", "2IIM CAT preparation", "https://online.2iim.com/free-cat-study-material.shtml", "Videos, via the 2IIM page", "RC, PS and PJ past paper walkthroughs. 1,700+ videos.", "must");
r("yt-rodha", "yt", "Rodha CAT preparation", "https://www.youtube.com/channel/UCHXQiDwicRon0tRuWj6r9HA", "YouTube channel", "A full free course including VARC, Master Parajumbles with Ayush Gupta, RC practice and critical reasoning.", "must");
r("yt-gejo-rc", "yt", "Gejo Speaks RC playlist, curated", "https://percentyl.in/resources/concepts/varc/reading-comprehension", "17 videos, about 13.5 hours", "RC strategy with a solved CAT 2019 passage.", "must");
r("yt-rodha-en", "yt", "Rodha CAT preparation in English", "https://www.youtube.com/@RODHACATPreparation-InEnglish", "YouTube channel", "The same content in English.", "good");
r("yt-cracku", "yt", "Cracku VARC playlist", "https://www.youtube.com/playlist?list=PLSjkMEhzZ_icihE5IwlFH_ETUuzoLs1lh", "YouTube playlist", "Past paper VARC solutions.", "good", { flag: 1 });
r("yt-iquanta", "yt", "iQuanta daily VARC practice", "https://www.youtube.com/playlist?list=PL4YW4OWyzRDSyTSuLOVaJzqCDYVuNF-Pi", "YouTube playlist", "Daily RC and VA practice.", "good", { flag: 1 });
r("yt-gejo-varc", "yt", "Gejo Sir VARC playlist", "https://www.youtube.com/playlist?list=PLj8E34obZYU0fcfUjtbIsNnD8RKY17Z-r", "YouTube playlist", "From concepts to past paper VARC.", "good", { flag: 1 });
r("yt-gradsquare", "yt", "GradSquare, Varun Krishnan", yt("GradSquare CAT VARC"), "YouTube search", "Argument mapping, tone and PJ logic.", "good", { find: 1 });
r("yt-mbapath", "yt", "MBA Pathshala VARC playlist", "https://www.youtube.com/playlist?list=PLLtQdEJkug7tFpnRZyWC9n-dXYTZOPnfI", "YouTube playlist", "VA question types.", "opt", { flag: 1 });
r("yt-pw", "yt", "Physics Wallah MBA one-shots", "https://www.pw.live/mba/exams/3-best-youtube-videos-to-master-varc-para-completion-para-jumbles-and-subject-verb-agreement", "Article with 3 videos", "Para jumbles and para completion.", "opt");
r("yt-others", "yt", "Other channels worth a look", yt("CAT VARC strategy Elites Grid Unacademy CATking IMS India"), "YouTube search", "Elites Grid, Unacademy CAT, CATking, Career Launcher, IMS India.", "opt", { find: 1 });

r("b-wpme", "vocab", "Word Power Made Easy", L.wpme, "Book. Norman Lewis", "Roots-based vocabulary, one session at a time. The Foundation phase vocabulary block follows it.", "must", { find: 1 });
r("anki", "vocab", "Anki", "https://apps.ankiweb.net", "Spaced repetition app", "An alternative to the Words tab if you want a separate app. Free on desktop and Android, paid on iOS.", "good");
r("etym", "vocab", "Etymonline", L.etym, "Etymology dictionary", "Look up any word's roots and history. Roots make new words guessable.", "good");
r("b-30days", "vocab", "30 Days to a More Powerful Vocabulary", amz("30 Days to a More Powerful Vocabulary Wilfred Funk Norman Lewis"), "Book. Wilfred Funk and Norman Lewis", "A short vocabulary sprint.", "opt", { find: 1 });
r("magoosh", "vocab", "Magoosh Vocabulary Builder", ggl("Magoosh Vocabulary Builder app"), "App", "1,200 GRE-level words, basic to advanced. Free.", "opt", { find: 1 });
r("c360-vocab", "vocab", "3000+ important English words for CAT", "https://bschool.careers360.com/download/ebooks/3000-english-vocabulary-word-list-for-cat-exam-meanings-antonyms-synonyms-download-pdf", "PDF word list", "A list drawn from past papers.", "opt");
r("vocabcom", "vocab", "Vocabulary.com", "https://www.vocabulary.com", "Website", "Words in context and quick lookup.", "opt");

r("tp-sarthak", "toppers", "Sarthak Gupta, CAT 2021", "https://s4.collegedunia.com/news/e-242-cat-2021-topper-interview-of-sarthak-gupta", "Interview", "100 percentile in VARC with an Excel log of every question.", "good");
r("tp-vallabha", "toppers", "Sri Vallabha, CAT 2025", "https://bschool.careers360.com/articles/cat-2025-topper-interview-tirupatis-iitian-sri-vallabhas-journey-to-99-94-percentile", "Interview", "Fixed VARC in one cycle, from about 80 to 96.96.", "good");
r("tp-sujay", "toppers", "Sujay Srivastava, CAT 2024", "https://bschool.careers360.com/articles/from-startup-hustle-to-cat-2024-topper-sujay-srivastavas-99-94-percentile-journey", "Interview", "From 83 in CAT 2022 to 99.74 in VARC, while working.", "good");
r("tp-vitrag", "toppers", "Vitrag Kothari, CAT 2024", "https://bschool.careers360.com/articles/vitrag-kothari-cat-2024-varc-topper-cat-2025-tips", "Interview", "Practiced at his slot time and focused on elimination.", "good");
r("tp-insideiim", "toppers", "How to crack VARC, tips by a CAT topper", "https://insideiim.com/how-to-crack-varc-cat-tips-by-cat-topper", "Article", "VARC tips from a topper.", "good");
r("tp-mbau", "toppers", "MBAUniverse CAT toppers", "https://www.mbauniverse.com/cat/topper", "Interviews", "50 topper strategies with a VARC table.", "good");
r("tp-iquanta25", "toppers", "iQuanta CAT 2025 analysis", "https://www.iquanta.in/blog/?p=81036", "Slot analysis", "RC topics and VA mix for all three 2025 slots.", "good");
r("tp-ims", "toppers", "IMS CAT 2025 analysis on Shiksha", "https://www.shiksha.com/mba/articles/ims-cat-2025-paper-analysis-slot-1-2-and-3-dilr-varc-qa-blogId-214850", "Slot analysis", "Passage-level difficulty ratings for every slot.", "good");
r("tp-analysis", "toppers", "MBAUniverse CAT analysis", "https://www.mbauniverse.com/cat/analysis", "Slot analysis", "Updated after each CAT, including CAT 2026 from 29 Nov 2026.", "good");
r("tp-c360", "toppers", "CAT VARC strategy for a 40+ score", "https://bschool.careers360.com/articles/cat-2026-varc-strategy-40-plus-score-99-percentile", "Article", "A VARC strategy aimed at 99 percentile.", "opt");
r("tp-catmock", "toppers", "Where CAT RC passages actually come from", "https://www.catmock.com/blog/where-do-cat-rc-passages-actually-come-from/", "Article", "A second view on passage sources.", "opt");

r("reddit", "community", "r/CATpreparation on Reddit", "https://www.reddit.com/r/CATpreparation/", "Community", "Peer mock discussion and resource threads.", "opt", { flag: 1 });
r("telegram", "community", "Rodha Telegram channel", "https://t.me/s/RODHARaviPrakash", "Community", "Live class alerts and free PDFs.", "opt");
r("cracku-yt", "community", "Cracku: best YouTube channels for CAT", "https://cracku.in/best-youtube-channels-for-cat-preparation/", "Directory", "A channel shortlist.", "opt");
r("gh-material", "community", "CAT-Study-Material on GitHub", "https://github.com/manjunath5496/CAT-Study-Material", "PDF collection", "Old past papers from 1990 to 2018 and word lists. It may host copyrighted book scans, so take only the past papers.", "opt");

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
