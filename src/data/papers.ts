import type { Link } from "../sections/types";

/** Bodhee Prep's free past-paper PDFs (full papers, all three sections), checked on 18 Oct 2026.
 *  Names match the timetable's paper names, so a "Timed paper" block can link straight to its file. */
export const PAPERS_PAGE = "https://bodheeprep.com/cat-question-paper-previous-years-pdf";
const U = "https://bodheeprep.com/wp-content/uploads/";

export const PAPER_PDFS: Link[] = [
  ["CAT 2024 Slot 1", U + "2024/12/CAT-2024-Slot-01-Final-with-Answer-Keys.pdf"],
  ["CAT 2024 Slot 2", U + "2024/12/CAT-2024-Slot-02-Final-with-Answer-Keys.pdf"],
  ["CAT 2023 Slot 1", U + "2023/12/CAt-2023-Question-Paper-slot-01-answer-keys-Bodheeprep.pdf"],
  ["CAT 2023 Slot 2", U + "2023/12/CAt-2023-Question-Paper-slot-02-answer-keys-Bodheeprep.pdf"],
  ["CAT 2023 Slot 3", U + "2023/12/CAt-2023-Question-Paper-slot-03.pdf"],
  ["CAT 2022 Slot 1", U + "2022/12/CAT-2022-Question-Paper-Slot-1-with-Answer-Keys-Bodhee-Prep.pdf"],
  ["CAT 2022 Slot 2", U + "2024/12/CAT-2022-Question-Paper-slot-2-with-Answer-Keys-by-Bodhee-Prep.pdf"],
  ["CAT 2022 Slot 3", U + "2024/12/CAT-2022-Question-Paper-slot-3-with-Answer-Keys-by-Bodhee-Prep.pdf"],
  ["CAT 2021 Slot 1", U + "2021/12/CAT-2021-paper-slot-1-with-answer-keys.pdf"],
  ["CAT 2021 Slot 2", U + "2021/12/CAT-2021-paper-slot-2-with-answer-keys.pdf"],
  ["CAT 2021 Slot 3", U + "2021/12/CAT-2021-paper-slot-3-with-answer-keys.pdf"],
  ["CAT 2020 Slot 1", U + "2020/12/CAT-2020-Question-paper-with-Solutions-Slot-1-Bodhee-Prep.pdf"],
  ["CAT 2020 Slot 2", U + "2020/12/CAT-2020-Question-paper-with-Solutions-Slot-2-Bodhee-Prep.pdf"],
  ["CAT 2020 Slot 3", U + "2020/12/CAT-2020-Question-paper-with-Solutions-Slot-3-Bodhee-Prep.pdf"],
  ["CAT 2019 Slot 1", U + "2020/12/CAT-2019-OFFICIAL-question-paper-solution-slot-1-Bodheeprep.pdf"],
  ["CAT 2019 Slot 2", U + "2020/12/CAT-2019-OFFICIAL-question-paper-solution-slot-2-Bodheeprep.pdf"],
  ["CAT 2018 Slot 1", U + "2019/04/CAT-2018-question-paper-with-Solution-SLOT-1-Bodhee-Prep.pdf"],
  ["CAT 2018 Slot 2", U + "2019/04/CAT-2018-question-paper-with-Solution-SLOT-2-Bodhee-Prep.pdf"],
  ["CAT 2017 Slot 1", U + "2021/01/CAT-2017-Question-Paper-with-Solution-SLOT-1.pdf"],
  ["CAT 2017 Slot 2", U + "2021/01/CAT-2017-Question-Paper-with-Solution-SLOT-2.pdf"],
  ...["2008", "2007", "2006", "2005", "2004"].map((y): Link => ["CAT " + y, U + "2021/01/CAT-" + y + "-Question-Paper-with-Solution.pdf"]),
  ["CAT 2003 Paper R", U + "2021/01/CAT-2003-R-Question-Paper-with-Solution.pdf"],
  ["CAT 2003 Paper L", U + "2021/01/CAT-2003-L-Question-Paper-with-Solution.pdf"],
  ...Array.from({ length: 12 }, (_, i): Link => {
    const y = String(2002 - i);
    return ["CAT " + y, U + "2021/01/CAT-" + y + "-Question-Paper-with-Solution.pdf"];
  }),
];

const BY_NAME = new Map(PAPER_PDFS.map(([n, u]) => [n.toLowerCase(), u]));

/** The PDF for a paper named like "CAT 2019 Slot 1", if there is one. */
export const paperPdf = (name: string) => BY_NAME.get(name.trim().toLowerCase());
