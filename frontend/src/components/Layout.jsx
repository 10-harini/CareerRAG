
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const pageNames = {
  "/": "Dashboard",
  "/resume-analyzer": "Resume Analyzer",
  "/job-match": "Job Match",
  "/skill-gap": "Skill Gap Analysis",
  "/roadmap": "Career Roadmap",
  "/interview-coach": "Interview Coach",
  "/career-chat": "AI Career Chat",
};

export default function Layout() {
  const location = useLocation();
  const title = pageNames[location.pathname] || "CareerRAG";

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-panel">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace / </span>
            <strong>{title}</strong>
          </div>

          <div className="topbar-right">
            <span className="status-dot" />
            <span>Career Assistant</span>
            <div className="avatar">H</div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>

        <footer className="app-footer">
          <p>© {new Date().getFullYear()} CareerRAG. All rights reserved.</p>
          <span>Built with care to help you navigate your career with AI.</span>
        </footer>
      </main>
    </div>
  );
}
