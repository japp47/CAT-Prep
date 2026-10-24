import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortDate, todayIso, uid } from "../../lib/date";
import { useStore } from "../../lib/store";
import { ContentGate } from "../../components/Content";
import { LinkButton, Meta, Page, PageHeader, Section, Stat } from "../../components/kit";
import type { Content } from "../../practice/content";
import { speedSetOfDay } from "../../practice/daily";
import { fmtSecs, LETTERS } from "../../practice/record";
import { setWords, type RcSet } from "../../practice/types";
import { Choice, ChoiceGroup, Confirm, ScoreCard, useLeaveConfirmation } from "./common";

/** CAT has about 2,000 words of RC; reading them in 10 minutes leaves time for the questions. */
const EXAM_PACE = 200;
/** A run shorter than this is a mis-tap, not a reading. */
const MIN_SECS = 15;

function verdict(wpm: number, recall: number) {
  if (recall < 2) return "Speed only counts with full recall. Slow down a little and read for the argument.";
  if (wpm < 150) return "Below CAT pace. Daily reading of dense essays will lift this steadily.";
  if (wpm < EXAM_PACE) return "Close to CAT pace. Keep reading daily and test again in a couple of weeks.";
  if (wpm <= 280) return "At CAT pace, with full recall. Keep it steady.";
  return "Fast, with full recall. Make sure you still catch the author's tone and qualifiers.";
}

type Phase = "intro" | "read" | "recall" | "done";

export default function SpeedTest() {
  return <ContentGate>{(c) => <SpeedPage c={c} />}</ContentGate>;
}

function SpeedPage({ c }: { c: Content }) {
  const { rcSets, rcById } = c;
  const { state, update } = useStore();
  const today = todayIso();
  const [set, setSet] = useState<RcSet>(() => rcById(speedSetOfDay(today).id) ?? rcSets[0]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [picks, setPicks] = useState<(number | null)[]>([null, null]);
  const [tooQuick, setTooQuick] = useState(false);
  const [result, setResult] = useState<{ wpm: number; secs: number; recall: number } | null>(null);
  const startAt = useRef(0);
  const readSecs = useRef(0);
  const leave = useLeaveConfirmation(phase === "read" || phase === "recall");

  const runs = [...state.speedRuns].sort((a, b) => (a.d < b.d ? 1 : -1));
  const best = runs.filter((r) => r.recall === 2).reduce((m, r) => Math.max(m, r.wpm), 0);
  const words = setWords(set);

  const random = () => {
    const recent = new Set(runs.slice(0, 10).map((r) => r.set));
    const pool = rcSets.filter((s) => !recent.has(s.id) && s.id !== set.id);
    const list = pool.length ? pool : rcSets.filter((s) => s.id !== set.id);
    setSet(list[Math.floor(Math.random() * list.length)]);
  };
  const begin = () => { startAt.current = Date.now(); setPhase("read"); window.scrollTo(0, 0); };
  const doneReading = () => { readSecs.current = (Date.now() - startAt.current) / 1000; setPhase("recall"); window.scrollTo(0, 0); };
  const finish = () => {
    const secs = readSecs.current;
    if (secs < MIN_SECS) { setTooQuick(true); setPhase("intro"); setPicks([null, null]); return; }
    setTooQuick(false);
    const wpm = Math.round(words / Math.max(secs / 60, 0.1));
    const recall = set.recall.filter((r, i) => picks[i] === r.answer).length;
    update((st) => { st.speedRuns.push({ id: uid(), d: today, set: set.id, words, secs: Math.round(secs), wpm, recall }); });
    setResult({ wpm, secs, recall });
    setPhase("done");
  };
  const again = () => { setPicks([null, null]); setResult(null); random(); setPhase("intro"); };

  return (
    <Page width="read">
      <PageHeader title="Reading speed test" back={{ to: "/varc/practice", label: "VARC practice" }}>
        Read one passage at your natural pace, then answer two recall questions. Speed only counts when you remember what you read.
      </PageHeader>

      {phase === "intro" && (
        <div className="flex flex-col gap-5 rounded-lg bg-card p-5 sm:p-7">
          {tooQuick && <p className="rounded-md bg-danger-soft px-4 py-3 text-base text-danger" role="alert">That was under {MIN_SECS} seconds, too quick to measure, so it was not saved. Read the whole passage, then tap Done reading.</p>}
          <div className="flex flex-col gap-1">
            <h2 className="text-heading font-semibold">{set.title}</h2>
            <Meta>{words} words, picked for today. The clock starts when the passage appears and stops when you tap Done reading.</Meta>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={begin}>Start reading</Button>
            <Button size="lg" variant="secondary" onClick={random}>Pick another passage</Button>
          </div>
          <div className="flex flex-wrap gap-x-12 gap-y-3 pt-2">
            <Stat value={best ? best + " wpm" : "None yet"} label="Your best with full recall" />
            <Stat value={`about ${EXAM_PACE} wpm`} label="CAT pace" />
          </div>
        </div>
      )}

      {phase === "read" && (
        <>
          <article className="flex flex-col gap-4 rounded-lg bg-card px-5 py-6 sm:px-8">{set.paras.map((p, i) => <p key={i} className="text-reading">{p}</p>)}</article>
          <div><Button size="lg" onClick={doneReading}>Done reading</Button></div>
        </>
      )}

      {phase === "recall" && (
        <div className="flex flex-col gap-6">
          <p className="text-base text-muted-foreground">The passage is hidden. Answer from memory.</p>
          {set.recall.map((r, qi) => (
            <div key={qi} className="flex flex-col gap-3">
              <p className="text-lg leading-snug font-semibold">{qi + 1}. {r.q}</p>
              <ChoiceGroup label={"Options for recall question " + (qi + 1)}>
                {r.options.map((o, i) => <Choice key={i} mark={LETTERS[i]} checked={picks[qi] === i} onClick={() => setPicks((p) => p.map((x, k) => (k === qi ? i : x)))}>{o}</Choice>)}
              </ChoiceGroup>
            </div>
          ))}
          <div><Button size="lg" disabled={picks.some((p) => p === null)} onClick={finish}>See my result</Button></div>
        </div>
      )}

      {phase === "done" && result && (
        <ScoreCard score={result.wpm} unit="wpm" parts={[["Recall", `${result.recall} of 2`], ["Time", fmtSecs(result.secs)], ["Words", words]]}>
          <p className="text-lg">{verdict(result.wpm, result.recall)}</p>
          {set.recall.map((r, i) => picks[i] !== r.answer && <p key={i} className="text-base text-muted-foreground">Question {i + 1}: the answer was “{r.options[r.answer]}”.</p>)}
          <div className="flex flex-wrap gap-3">
            <Button onClick={again}>Test again</Button>
            {rcById(set.id) && <LinkButton to={`/practice/rc/${set.id}`} variant="secondary">Answer the RC questions on this passage</LinkButton>}
          </div>
        </ScoreCard>
      )}

      <Confirm open={leave.open} onOpenChange={leave.onOpenChange} title="Leave this test?" action="Leave test" onAction={leave.onLeave} cancel="Keep reading" danger actionClassName="!text-white dark:!text-black">
        This run is not saved. If you return, you will start a new test from the beginning.
      </Confirm>

      {runs.length > 0 && phase !== "read" && (
        <Section title="Your recent runs">
          <ul className="flex flex-col gap-1">
            {runs.slice(0, 8).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md bg-card px-4 py-3">
                <span className="flex flex-col">
                  <b className="text-base font-semibold tabular-nums">{r.wpm} wpm</b>
                  <Meta>{shortDate(r.d)}, {rcById(r.set)?.title ?? r.set}, {fmtSecs(r.secs)}</Meta>
                </span>
                <Badge variant={r.recall === 2 ? "success" : "secondary"}>Recall {r.recall} of 2</Badge>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Page>
  );
}
