import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Page, PageHeader, Segmented, Stat } from "../components/kit";
import { usePref } from "../lib/prefs";
import { useStore } from "../lib/store";
import { SECTIONS, sectionByLabel } from "../sections";
import { Log } from "./tracker/Log";
import { Mocks } from "./tracker/Mocks";
import { Report } from "./tracker/Report";
import { ThreeAnswers } from "./tracker/Fixing";

type Tab = "report" | "mocks" | "log";
const TAB = "h-auto min-h-10 flex-auto whitespace-normal px-2.5 leading-tight sm:px-3.5";

export default function Progress() {
  const { state } = useStore();
  const [sp] = useSearchParams();
  // A link such as /progress?sec=DILR (from an LR drill) opens on that section.
  const [sec, setSec] = useState(() => SECTIONS.find((s) => s.short === sp.get("sec"))?.short ?? "VARC");
  const [tab, setTab] = usePref<Tab>("progTab", "report");
  // A link such as /progress?tab=log (from History) opens that tab once.
  const asked = sp.get("tab");
  useEffect(() => { if (asked === "report" || asked === "mocks" || asked === "log") setTab(asked); }, [asked, setTab]);
  const def = sectionByLabel(sec);

  const rows = state.practice.filter((p) => p.sec === sec);
  const totA = rows.reduce((s, x) => s + x.a, 0), totC = rows.reduce((s, x) => s + x.c, 0);
  const papers = state.mocks.filter((m) => m.sec === sec).length;

  return (
    <Page>
      <PageHeader title="Progress">Your report card shows what to work on, mocks and target show whether you are on track, and the log is where you add results by hand.</PageHeader>

      <div className="-mt-4 flex flex-col gap-6">
        <Segmented label="Section" value={sec} onChange={setSec} options={SECTIONS.map((s) => s.short)} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-lg bg-card p-5 sm:grid-cols-4 sm:gap-x-8 sm:gap-y-0 sm:p-6">
          <Stat value={totA} label="Questions done" />
          <Stat value={totA ? Math.round((totC / totA) * 100) + "%" : "None yet"} label="Accuracy" />
          <Stat value={papers} label="Papers and mocks" />
          <Stat value={state.errors.filter((e) => e.sec === sec).length} label="Errors logged" />
        </div>
        {def.short === "VARC" && <ThreeAnswers />}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-8">
        {/* Full width on a phone, each tab as wide as its label; a label wraps only on the narrowest screens. */}
        <TabsList className="flex w-full bg-secondary sm:w-fit">
          <TabsTrigger value="report" className={TAB}>Report card</TabsTrigger>
          <TabsTrigger value="mocks" className={TAB}>Mocks and target</TabsTrigger>
          <TabsTrigger value="log" className={TAB}>Log</TabsTrigger>
        </TabsList>
        <TabsContent value="report"><Report sec={def.short} /></TabsContent>
        <TabsContent value="mocks"><Mocks sec={def.short} /></TabsContent>
        <TabsContent value="log"><Log sec={def.short} /></TabsContent>
      </Tabs>
    </Page>
  );
}
