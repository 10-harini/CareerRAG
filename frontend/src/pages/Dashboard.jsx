
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = "http://127.0.0.1:8000";

const features = [
  {
    icon: "▤",
    title: "Resume Analyzer",
    description: "Upload your resume and process your career documents.",
    path: "/resume-analyzer",
    action: "Analyze resume",
  },
  {
    icon: "◎",
    title: "Job Match",
    description: "Compare your resume against a target job description.",
    path: "/job-match",
    action: "Check compatibility",
  },
  {
    icon: "▥",
    title: "Skill Gap Analysis",
    description: "Discover skills to strengthen for your target role.",
    path: "/skill-gap",
    action: "Explore skills",
  },
  {
    icon: "⌁",
    title: "Career Roadmap",
    description: "Plan your next steps toward your career goal.",
    path: "/roadmap",
    action: "View roadmap",
  },
  {
    icon: "✳",
    title: "Interview Coach",
    description: "Practice questions and evaluate your answers.",
    path: "/interview-coach",
    action: "Start practicing",
  },
  {
    icon: "◉",
    title: "AI Career Chat",
    description: "Explore career questions with your AI assistant.",
    path: "/career-chat",
    action: "Start chatting",
  },
];

export default function Dashboard() {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/match`);
      const data = await response.json();

      if (!response.ok || data.error) {
        setMatchData(null);
        setError(
          data.error ||
            "Upload your resume and job description to see your match score."
        );
        return;
      }

      setMatchData(data);
    } catch {
      setMatchData(null);
      setError(
        "Couldn't connect to CareerRAG. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const score = Number(matchData?.match_percentage);
  const hasScore = matchData && Number.isFinite(score);
  const matchingCount = Array.isArray(matchData?.matching_skills)
    ? matchData.matching_skills.length
    : 0;
  const missingCount = Array.isArray(matchData?.missing_skills)
    ? matchData.missing_skills.length
    : 0;

  return (
    <div className="dashboard">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="eyebrow">YOUR PERSONAL CAREER WORKSPACE</span>
          <h1>Turn your skills into your next opportunity.</h1>
          <p>
            Analyze your resume, discover skill gaps, and prepare
            for your next career move — all in one place.
          </p>
          <Link className="primary-button" to="/resume-analyzer">
            Analyze my resume <span>→</span>
          </Link>
        </div>

        <div className="welcome-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-symbol">✦</div>
          <span className="floating-tag tag-one">AI insights</span>
          <span className="floating-tag tag-two">Career growth</span>
        </div>
      </section>

      <section className="dashboard-overview">
        <div className="section-heading">
          <div>
            <h2>Your career overview</h2>
            <p>Live information from your CareerRAG workspace.</p>
          </div>
          <button
            className="dashboard-refresh"
            onClick={loadDashboard}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        <div className="overview-grid">
          <article className="overview-card">
            <span className="overview-label">Resume & job description</span>
            <strong className="overview-value overview-status">
              {loading
                ? "Checking..."
                : hasScore
                  ? "Ready"
                  : "Action needed"}
            </strong>
            <p>
              {hasScore
                ? "Your documents were sufficient to generate a match."
                : "Upload or check both documents to get started."}
            </p>
            <Link to="/resume-analyzer">Manage documents →</Link>
          </article>

          <article className="overview-card">
            <span className="overview-label">Job match score</span>
            <strong className="overview-value">
              {loading ? "—" : hasScore ? `${score}%` : "—"}
            </strong>
            <p>
              {hasScore
                ? "Your current resume-to-job compatibility."
                : "Your score will appear after a successful match."}
            </p>
            <Link to="/job-match">View job match →</Link>
          </article>

          <article className="overview-card">
            <span className="overview-label">Skills identified</span>
            <strong className="overview-value">
              {loading || !hasScore
                ? "—"
                : matchingCount + missingCount}
            </strong>
            <p>
              {hasScore
                ? `${matchingCount} matching · ${missingCount} to strengthen`
                : "Skill insights appear after matching your documents."}
            </p>
            <Link to="/skill-gap">Explore skill gaps →</Link>
          </article>
        </div>

        {!loading && error && (
          <div className="dashboard-notice" role="status">
            <p>{error}</p>
            <Link to="/resume-analyzer">Go to Resume Analyzer →</Link>
          </div>
        )}
      </section>

      <div className="section-heading">
        <div>
          <h2>Your workspace</h2>
          <p>Choose a tool to continue.</p>
        </div>
        <span className="section-count">06 tools</span>
      </div>

      <section className="feature-grid">
        {features.map((feature, index) => (
          <article className="feature-card" key={feature.path}>
            <div className={`feature-icon icon-${index}`}>
              {feature.icon}
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <Link to={feature.path} className="feature-link">
              {feature.action} <span>→</span>
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
