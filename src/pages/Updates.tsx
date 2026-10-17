import { useState } from "react";
import { UpdateItem } from "../components/UpdateItem";
import { UPDATES } from "../data/updates";

const EXAMS = ["All", ...Array.from(new Set(UPDATES.map((u) => u.exam)))];

export default function Updates() {
  const [f, setF] = useState("All");
  const list = UPDATES.filter((u) => f === "All" || u.exam === f);
  return (
    <div className="page">
      <div className="view-head">
        <h1>Important updates</h1>
        <p>Dates and changes for CAT and other MBA exams. <b>Official</b> means the exam body has published it. <b>Expected</b> is based on past years and may change. Always confirm on the official site before you act.</p>
      </div>
      <div className="seg" role="group" aria-label="Filter by exam" style={{ alignSelf: "flex-start" }}>
        {EXAMS.map((e) => <button key={e} type="button" aria-pressed={f === e} onClick={() => setF(e)}>{e}</button>)}
      </div>
      {list.map((u) => <UpdateItem key={u.id} u={u} />)}
    </div>
  );
}
