import { lazy, useEffect } from "react";
import { createBrowserRouter, createRoutesFromElements, Outlet, Route, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import { whenIdle } from "./lib/idle";
import { API_ENABLED } from "./lib/api";

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
const Journal = lazy(() => import("./pages/Journal"));
const MockReview = lazy(() => import("./pages/tracker/MockReview"));
const Review = lazy(() => import("./pages/Review"));
const History = lazy(() => import("./pages/History"));
const SignIn = lazy(() => import("./pages/SignIn"));
const You = lazy(() => import("./pages/You"));
const Admin = lazy(() => import("./pages/Admin"));
const Privacy = lazy(() => import("./pages/Privacy"));
// Only in builds with the API on: where a scanned link code lands (B4).
const LinkPage = API_ENABLED ? lazy(() => import("./pages/Link")) : null;

const TITLES: Record<string, string> = {
  "/": "99ile: free CAT prep", "/today": "Today", "/plan": "Plan and time", "/practice": "Practice", "/practice/library": "RC library", "/practice/sectional": "VARC sectional", "/practice/va": "VA drill", "/practice/cr": "Critical reasoning drill", "/practice/speed": "Reading speed test", "/practice/redo": "Redo queue", "/varc": "VARC", "/dilr": "DILR", "/quant": "Quant",
  "/progress": "Progress", "/progress/mock-review": "Analyse a mock", "/review": "Weekly review", "/errors": "Error log", "/words": "Words", "/journal": "Reading journal", "/updates": "Important updates", "/exams": "CAT and other exams",
  "/guides": "Guides", "/stories": "Topper stories", "/roadmap": "What's coming", "/settings": "Settings", "/link": "Link this device", "/privacy": "Privacy",
};

function Title() {
  const { pathname } = useLocation();
  useEffect(() => {
    const t = TITLES[pathname] ?? (pathname.startsWith("/guides/") ? "Guide" : pathname.startsWith("/practice/rc/") ? "RC practice" : pathname.startsWith("/progress/mock-review/") ? "Mock review" : pathname.startsWith("/review/") ? "Weekly review" : "");
    document.title = t && pathname !== "/" ? t + " · 99ile" : TITLES["/"];
  }, [pathname]);
  return null;
}

/**
 * Fetches the bottom-bar pages in advance, once the page in front of the student has loaded and the browser is idle,
 * so they never compete with it for a slow connection. Skipped with Data Saver on or on 2G.
 */
function usePreload() {
  useEffect(() => {
    const net = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (net?.saveData || /2g/.test(net?.effectiveType ?? "")) return;
    return whenIdle(() => { load.today(); load.practice(); load.progress(); }, 4000);
  }, []);
}

function App() {
  usePreload();
  return (
    <>
      <Title />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter(createRoutesFromElements(
  <Route element={<App />}>
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
      <Route path="progress/mock-review" element={<MockReview />} />
      <Route path="progress/mock-review/:id" element={<MockReview />} />
      <Route path="review" element={<Review />} />
      <Route path="review/:monday" element={<Review />} />
      <Route path="history" element={<History />} />
      <Route path="signin" element={<SignIn />} />
      <Route path="you" element={<You />} />
      <Route path="admin" element={<Admin />} />
      <Route path="errors" element={<Errors />} />
      <Route path="words" element={<Words />} />
      <Route path="journal" element={<Journal />} />
      <Route path="updates" element={<Updates />} />
      <Route path="exams" element={<Exams />} />
      <Route path="guides" element={<GuideList />} />
      <Route path="guides/:id" element={<GuidePage />} />
      <Route path="stories" element={<Stories />} />
      <Route path="roadmap" element={<Roadmap />} />
      <Route path="settings" element={<Settings />} />
      <Route path="privacy" element={<Privacy />} />
      {LinkPage && <Route path="link" element={<LinkPage />} />}
      <Route path=":id" element={<Section />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  </Route>,
), {
  basename: import.meta.env.BASE_URL,
  future: { v7_relativeSplatPath: true },
});
