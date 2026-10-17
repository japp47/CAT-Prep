import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Errors from "./pages/Errors";
import Exams from "./pages/Exams";
import { GuideList, GuidePage } from "./pages/Guides";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Plan from "./pages/Plan";
import PracticeHub from "./pages/practice/Hub";
import RcPlayer from "./pages/practice/RcPlayer";
import Redo from "./pages/practice/Redo";
import SpeedTest from "./pages/practice/SpeedTest";
import VaPlayer from "./pages/practice/VaPlayer";
import Progress from "./pages/Progress";
import Roadmap from "./pages/Roadmap";
import Section from "./pages/Section";
import Settings from "./pages/Settings";
import Stories from "./pages/Stories";
import Today from "./pages/Today";
import Updates from "./pages/Updates";
import Words from "./pages/Words";

const TITLES: Record<string, string> = {
  "/": "CAT Prep Hub", "/today": "Today", "/plan": "Plan and time", "/practice": "Practice", "/practice/va": "VA drill", "/practice/speed": "Reading speed test", "/practice/redo": "Redo queue", "/varc": "VARC", "/dilr": "DILR", "/quant": "Quant",
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

export default function App() {
  return (
    <>
      <Title />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="today" element={<Today />} />
          <Route path="plan" element={<Plan />} />
          <Route path="practice" element={<PracticeHub />} />
          <Route path="practice/rc/:id" element={<RcPlayer />} />
          <Route path="practice/va" element={<VaPlayer />} />
          <Route path="practice/speed" element={<SpeedTest />} />
          <Route path="practice/redo" element={<Redo />} />
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
