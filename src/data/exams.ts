/** Other MBA entrance exams. Windows are typical patterns, not announcements. Check each official site. */
export interface OtherExam {
  id: string;
  name: string;
  body: string;
  window: string;
  for: string;
  pattern: string;
  tip: string;
  site: string;
}

export const OTHER_EXAMS: OtherExam[] = [
  { id: "xat", name: "XAT", body: "XLRI Jamshedpur", window: "First week of January", for: "XLRI, XIMB, IMT, GIM, TAPMI and 150+ others", pattern: "Verbal and logical ability, decision making, quant and DI, plus general knowledge", tip: "Decision making is unique to XAT. Practise it from October. Its verbal section is denser than CAT.", site: "https://xatonline.in" },
  { id: "snap", name: "SNAP", body: "Symbiosis International University", window: "December, up to three attempts", for: "SIBM Pune, SIBM Bengaluru, SCMHRD, SIIB and other Symbiosis institutes", pattern: "Short test, fast questions on English, analytical reasoning and quant", tip: "Speed over depth. Take two or three SNAP mocks after CAT.", site: "https://www.snaptest.org" },
  { id: "nmat", name: "NMAT by GMAC", body: "GMAC", window: "Testing window from about October to December", for: "NMIMS Mumbai and other NMIMS campuses, plus several other schools", pattern: "Language skills, quantitative skills and logical reasoning, no negative marking", tip: "You can retake within the window, so book an early first attempt.", site: "https://www.mba.com/exams/nmat" },
  { id: "cmat", name: "CMAT", body: "National Testing Agency", window: "Usually early in the year", for: "AICTE-approved institutes across India", pattern: "Quant, logical reasoning, language, general awareness and innovation and entrepreneurship", tip: "Close to CAT preparation, with an added general awareness section.", site: "https://exams.nta.ac.in/CMAT/" },
  { id: "mahcet", name: "MAH MBA CET", body: "State CET Cell, Maharashtra", window: "March or April", for: "JBIMS, SIMSREE, PUMBA and other Maharashtra colleges", pattern: "Many easy questions, no negative marking. Logical and abstract reasoning carry the most weight.", tip: "Pure speed. Practise visual reasoning sets.", site: "https://cetcell.mahacet.org" },
  { id: "micat", name: "MICAT", body: "MICA Ahmedabad", window: "December and January or February", for: "MICA's PGDM in communications", pattern: "Psychometric test, descriptive writing, verbal, quant, general awareness and divergent thinking", tip: "Only one college, so take it if you are interested in marketing and communications.", site: "https://www.mica.ac.in" },
  { id: "gmat", name: "GMAT Focus Edition", body: "GMAC", window: "Any time of year", for: "ISB, IIM one-year programmes, and MBAs abroad", pattern: "Quant, verbal and data insights", tip: "Better suited once you have work experience. Scores stay valid for five years.", site: "https://www.mba.com/exams/gmat-exam" },
];

/** Schools that changed how they admit. Confirm in each school's current admission notice. */
export const VIA_CAT_NOTES = [
  { name: "IIFT", note: "IIFT's MBA (International Business) moved to CAT scores from the 2025 admissions cycle, replacing its own entrance test." },
  { name: "TISS", note: "TISS replaced TISSNET with CUET-PG from 2024." },
  { name: "FMS Delhi, MDI, SPJIMR, IIT B-schools", note: "These take CAT scores. SPJIMR also accepts GMAT and XAT." },
];
