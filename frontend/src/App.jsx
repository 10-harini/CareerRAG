
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ResumeAnalyzer from "./ResumeAnalyzer";
import JobMatch from "./pages/JobMatch";
import SkillGap from "./pages/SkillGap";
import CareerRoadmap from "./pages/CareerRoadmap";
import InterviewCoach from "./pages/InterviewCoach";
import CareerChat from "./pages/CareerChat";
import "./App.css";

function NotFound() {
  return (
    <section className="empty-page">
      <h1>Page not found</h1>
      <p>The page you requested doesn't exist.</p>
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />
          <Route path="/job-match" element={<JobMatch />} />
          <Route path="/skill-gap" element={<SkillGap />} />
          <Route path="/roadmap" element={<CareerRoadmap />} />
          <Route path="/interview-coach" element={<InterviewCoach />} />
          <Route path="/career-chat" element={<CareerChat />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
