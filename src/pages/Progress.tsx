import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Page, PageHeader, Segmented, Stat } from "../components/kit";
import { usePref } from "../lib/prefs";
import { useStore } from "../lib/store";
import { SECTIONS, sectionByLabel } from "../sections";
import { Log } from "./tracker/Log";
import { Mocks } from "./tracker/Mocks";
import { Report } from "./tracker/Report";

type Tab = "report" | "mocks" | "log";

export default function Progress() {
  const { state } = useStore();
  const [sec, setSec] = useState("VARC");
  const [tab, setTab] = usePref<Tab>("progTab", "report");
  const def = sectionByLabel(sec);

  const rows = state.practice.filter((p) => p.sec === sec);
  const totA = rows.reduce((s, x) => s + x.a, 0), totC = rows.reduce((s, x) => s + x.c, 0);
  const papers = state.mocks.filter((m) => m.sec === sec).length;

  return (
    <Page>
      <PageHeader title="Progress">Your report card shows what to work on, mocks and target show whether you are on track, and the log is where you add results by hand.</PageHeader>

      <div className="-mt-4 flex flex-col gap-6">
        <Segmented label="Section" value={sec} onChange={setSec} options={SECTIONS.map((s) => s.short)} />
        <div className="flex flex-wrap gap-x-12 gap-y-4 rounded-lg bg-card p-5 sm:p-6">
          <Stat value={totA} label="Questions done" />
          <Stat value={totA ? Math.round((totC / totA) * 100) + "%" : "None yet"} label="Accuracy" />
          <Stat value={papers} label="Papers and mocks" />
          <Stat value={state.errors.filter((e) => e.sec === sec).length} label="Errors logged" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-8">
        <div className="bleed-gutter overflow-x-auto px-gutter sm:mx-0 sm:px-0">
          <TabsList className="bg-secondary">
            <TabsTrigger value="report" className="px-3.5">Report card</TabsTrigger>
            <TabsTrigger value="mocks" className="px-3.5">Mocks and target</TabsTrigger>
            <TabsTrigger value="log" className="px-3.5">Log</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="report"><Report sec={def.short} /></TabsContent>
        <TabsContent value="mocks"><Mocks sec={def.short} /></TabsContent>
        <TabsContent value="log"><Log sec={def.short} /></TabsContent>
      </Tabs>
    </Page>
  );
}
