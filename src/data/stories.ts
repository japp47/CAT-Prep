export interface Topper { name: string; result: string; what: string; section: "VARC" | "Overall"; link?: string }

export const TOPPERS: Topper[] = [
  { name: "Sarthak Gupta", result: "CAT 2021, 100 in VARC", what: "Kept an Excel log of every passage and VA decision. 22 of 24 correct.", section: "VARC", link: "https://s4.collegedunia.com/news/e-242-cat-2021-topper-interview-of-sarthak-gupta" },
  { name: "Nancy Jain", result: "CAT 2020, 99.72", what: "6 to 7 articles and 4 to 5 RCs a day. From the 50s in VARC mocks to 94 in CAT.", section: "VARC" },
  { name: "Harshit Pansari", result: "CAT 2024, 99.18", what: "About 75% of prep time on VARC. Read JSTOR Daily.", section: "VARC" },
  { name: "Srishti Yadav", result: "CAT 2022, 99.69", what: "Dropped PJ and PS when they kept costing marks and did only RCs. Her score went up.", section: "VARC" },
  { name: "Pranshav Shah", result: "CAT 2025, 99.80", what: "Newspaper habit. Eliminated three options before marking any RC answer.", section: "VARC" },
  { name: "Vitrag Kothari", result: "CAT 2024, 99.35", what: "Practiced VARC daily at his slot time. Focused on elimination.", section: "VARC", link: "https://bschool.careers360.com/articles/vitrag-kothari-cat-2024-varc-topper-cat-2025-tips" },
  { name: "Harsh Khudania", result: "CAT 2025, 99.93", what: "20 mocks in the final month. Last two months for mocks and revision only.", section: "Overall" },
  { name: "Sri Vallabha", result: "CAT 2025, 99.94", what: "VARC from about 80 percentile in 2024 to 96.96 in 2025.", section: "VARC", link: "https://bschool.careers360.com/articles/cat-2025-topper-interview-tirupatis-iitian-sri-vallabhas-journey-to-99-94-percentile" },
  { name: "Sujay Srivastava", result: "CAT 2024, 99.94", what: "From 83 in CAT 2022 to 99.74 in VARC, while working at a startup.", section: "VARC", link: "https://bschool.careers360.com/articles/from-startup-hustle-to-cat-2024-topper-sujay-srivastavas-99-94-percentile-journey" },
  { name: "Anish Ghosh", result: "99.73 in VARC", what: "Consistent reading and daily practice. Warns against reading the questions before the passage.", section: "VARC" },
];

export const LESSONS = [
  { h: "They read every day", p: "Almost every VARC topper names a daily reading habit, usually newspapers early on and long-form essays later." },
  { h: "They logged mistakes", p: "Sarthak Gupta's spreadsheet of every passage is the extreme version. A simple error log works the same way." },
  { h: "They dropped what did not work", p: "Srishti Yadav stopped attempting para jumbles and summaries when they kept costing marks, and her score rose." },
  { h: "They took mocks seriously late", p: "Most 99+ scorers took 20 or more mocks, the bulk of them in the last two to three months." },
];

export const BENCHMARKS = [
  { year: "2025", p99: "42.77", p999: "53.01", src: "Cracku all-slot table. MBAKaro gives 43 and 54." },
  { year: "2024", p99: "40.3", p999: "55", src: "Cracku" },
];

export const PASSAGE_SOURCES = [
  { year: "2025", text: "Slot 1: complex systems (Aeon), electronic music (JSTOR), income inequality, insanity and criminal responsibility. Slot 2: literary geography, cavefish evolution (Knowable), Big Tech and AI language (The Guardian), scientific instruments. Slot 3: tribal art and time (NCERT), AI and formalised ethics (Aeon), Indian Forest Acts, dams and sacrifice zones (Boston Review)." },
  { year: "2024", text: "The Economist (three passages), Smithsonian, The Guardian, Public Books, Yale Global, NYT Magazine, Nature, Foreign Policy, HuffPost." },
  { year: "2023", text: "The Economist (three passages), The Conversation, Public Books, Prospect, The Wire Science, Stanford Encyclopedia of Philosophy, LA Times, Washington Post, E.H. Carr's What Is History?" },
];
