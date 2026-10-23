
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", icon: "⌂", end: true },
  { to: "/resume-analyzer", label: "Resume Analyzer", icon: "▤" },
  { to: "/job-match", label: "Job Match", icon: "◎" },
  { to: "/skill-gap", label: "Skill Gap Analysis", icon: "▥" },
  { to: "/roadmap", label: "Career Roadmap", icon: "⌁" },
  { to: "/interview-coach", label: "Interview Coach", icon: "✳" },
  { to: "/career-chat", label: "AI Career Chat", icon: "◉" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/" className="brand">
        <span className="brand-logo">C</span>
        <span>
          <strong>CareerRAG</strong>
          <small>AI Career Platform</small>
        </span>
      </NavLink>

      <div className="nav-heading">WORKSPACE</div>

      <nav className="side-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-help">
          <span className="help-icon">✦</span>
          <strong>Your next opportunity starts here.</strong>
          <p>Build your skills. Prepare with confidence.</p>
        </div>
        <div className="sidebar-version">CareerRAG · AI-powered career growth</div>
      </div>
    </aside>
  );
}
