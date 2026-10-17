import type { Update } from "../data/updates";
import { mediumDate } from "../lib/date";
import { Ext } from "./Links";

const STATUS = { official: ["Official", "t-official"], expected: ["Expected", "t-expected"], tip: ["Tip", "t-good"] } as const;

export function UpdateItem({ u }: { u: Update }) {
  const [label, cls] = STATUS[u.status];
  return (
    <article className="card upd">
      <div className="upd-top">
        <span className="tag t-type">{u.exam}</span>
        <span className={"tag " + cls}>{label}</span>
        <span className="eyebrow">Posted {mediumDate(u.date)}</span>
      </div>
      <h3>{u.title}</h3>
      <p>{u.body}</p>
      {u.link && <Ext className="go" href={u.link[1]}>{u.link[0]} ↗</Ext>}
    </article>
  );
}
