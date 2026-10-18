import { lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Each page loads when it is first opened, so the first visit downloads only the shell and the home page.
// The pages in the phone's bottom bar are fetched once the browser is idle, so they open without a wait.
const load = {
  today: () => import("./pages/Today"),
  practice: () => import("./pages/practice/Hub"),
  progress: () => import("./pages/Progress"),
};
const Errors = lazy(() => import("./pages/Errors"));
const Exams = lazy(() => import("./pages/Exams"));
const GuideList = lazy(() => import("./pages/Guides").then((m) => ({ default: m.GuideList })));
const GuidePage = lazy(() => import("./pages/Guides").then((m) => ({ default: m.GuidePage })));
const Plan = lazy(() => import("./pages/Plan"));
const PracticeHub = lazy(load.practice);
const Library = lazy(() => import("./pages/practice/Library"));
const RcPlayer = lazy(() => import("./pages/practice/RcPlayer"));
const Redo = lazy(() => import("./pages/practice/Redo"));
const Sectional = lazy(() => import("./pages/practice/Sectional"));
const SectionalReview = lazy(() => import("./pages/practice/Sectional").then((m) => ({ default: m.SectionalReview })));
const SpeedTest = lazy(() => import("./pages/practice/SpeedTest"));
const VaPlayer = lazy(() => import("./pages/practice/VaPlayer"));
const CrPlayer = lazy(() => import("./pages/practice/CrPlayer"));
const Progress = lazy(load.progress);
const Roadmap = lazy(() => import("./pages/Roadmap"));
const Section = lazy(() => import("./pages/Section"));
const Settings = lazy(() => import("./pages/Settings"));
const Stories = lazy(() => import("./pages/Stories"));
const Today = lazy(load.today);
const Updates = lazy(() => import("./pages/Updates"));
const Words = lazy(() => import("./pages/Words"));

const TITLES: Record<string, string> = {
  "/": "CAT Prep Hub", "/today": "Today", "/plan": "Plan and time", "/practice": "Practice", "/practice/library": "RC library", "/practice/sectional": "VARC sectional", "/practice/va": "VA drill", "/practice/cr": "Critical reasoning drill", "/practice/speed": "Reading speed test", "/practice/redo": "Redo queue", "/varc": "VARC", "/dilr": "DILR", "/quant": "Quant",
  "/progress": "Progress", "/errors": "Error log", "/words": "Words", "/updates": "Important updates", "/exams": "CAT and other exams",
  "/guides": "Guides", "/stories": "Topper stories", "/roadmap": "What's coming", "/settings": "Settings",
};

function Title() {
  const { pathname } = useLocation();
  useEffect(() => {
    const t = TITLES[pathname] ?? (pathname.startsWith("/guides/") ? "Guide" : pathname.startsWith("/practice/rc/") ? "RC practice" : "");
    document.title = t && pathname !== "/" ? t + " · CAT Prep Hub" : "CAT Prep Hub";
  }, [pathname]);
  return null;
}

function usePreload() {
  useEffect(() => {
    const run = () => { load.today(); load.practice(); load.progress(); };
    // Safari has no requestIdleCallback.
    if ("requestIdleCallback" in window) { const id = requestIdleCallback(run, { timeout: 4000 }); return () => cancelIdleCallback(id); }
    const id = setTimeout(run, 2000);
    return () => clearTimeout(id);
  }, []);
}

export default function App() {
  usePreload();
  return (
    <>
      <Title />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="today" element={<Today />} />
          <Route path="plan" element={<Plan />} />
          <Route path="practice" element={<PracticeHub />} />
          <Route path="practice/library" element={<Library />} />
          <Route path="practice/rc/:id" element={<RcPlayer />} />
          <Route path="practice/va" element={<VaPlayer />} />
          <Route path="practice/cr" element={<CrPlayer />} />
          <Route path="practice/speed" element={<SpeedTest />} />
          <Route path="practice/redo" element={<Redo />} />
          <Route path="practice/sectional" element={<Sectional />} />
          <Route path="practice/sectional/:id" element={<SectionalReview />} />
          <Route path="progress" element={<Progress />} />
          <Route path="errors" element={<Errors />} />
          <Route path="words" element={<Words />} />
          <Route path="updates" element={<Updates />} />
          <Route path="exams" element={<Exams />} />
          <Route path="guides" element={<GuideList />} />
          <Route path="guides/:id" element={<GuidePage />} />
          <Route path="stories" element={<Stories />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="settings" element={<Settings />} />
          <Route path=":id" element={<Section />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
