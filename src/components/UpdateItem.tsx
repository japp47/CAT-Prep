import { Badge } from "@/components/ui/badge";
import type { Update } from "../data/updates";
import { mediumDate } from "../lib/date";
import { LinkButton, Meta } from "./kit";

const STATUS = { official: ["Official", "success"], expected: ["Expected", "warning"], tip: ["Tip", "default"] } as const;

export function UpdateItem({ u }: { u: Update }) {
  const [label, variant] = STATUS[u.status];
  return (
    <article className="flex flex-col gap-3 rounded-lg bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{u.exam}</Badge>
        <Badge variant={variant}>{label}</Badge>
        <Meta>Posted {mediumDate(u.date)}</Meta>
      </div>
      <h2 className="text-heading font-semibold">{u.title}</h2>
      <p className="measure text-base text-foreground/85">{u.body}</p>
      {u.link && <div><LinkButton to={u.link[1]} variant="secondary" size="sm">{u.link[0]}</LinkButton></div>}
    </article>
  );
}
