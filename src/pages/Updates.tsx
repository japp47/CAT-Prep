import { useState } from "react";
import { UpdateItem } from "../components/UpdateItem";
import { Page, PageHeader, Segmented } from "../components/kit";
import { UPDATES } from "../data/updates";

const EXAMS = ["All", ...Array.from(new Set(UPDATES.map((u) => u.exam)))];

export default function Updates() {
  const [f, setF] = useState("All");
  const list = [...UPDATES].sort((a, b) => b.date.localeCompare(a.date)).filter((u) => f === "All" || u.exam === f);
  return (
    <Page width="read">
      <PageHeader title="Important updates">
        Dates and changes for CAT and other MBA exams. <b className="font-semibold">Official</b> means the exam body has published it. <b className="font-semibold">Expected</b> is based on past years and may change. Always confirm on the official site before you act.
      </PageHeader>
      <div className="-mt-4 flex flex-col gap-4">
        {EXAMS.length > 2 && <Segmented label="Filter by exam" value={f} onChange={setF} options={EXAMS} />}
        {list.map((u) => <UpdateItem key={u.id} u={u} />)}
      </div>
    </Page>
  );
}
