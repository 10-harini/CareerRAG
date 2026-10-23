
import { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

export default function SkillGap() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyzeSkills() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/skill-gap`);

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to CareerRAG. Check that the backend is running."
          : err.message || "Unable to analyze skills. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function priorityClass(priority) {
    const value = String(priority || "").toLowerCase();

    if (value === "high") return "sg-priority-high";
    if (value === "medium") return "sg-priority-medium";
    if (value === "low") return "sg-priority-low";

    return "sg-priority-default";
  }

  return (
    <main className="skill-gap-page">
      <section className="sg-hero">
        <div>
          <span className="eyebrow">PERSONALIZED CAREER INSIGHTS</span>
          <h1>Skill Gap Analysis</h1>
          <p>
            Discover important skills not yet demonstrated in your
            resume and get practical steps to strengthen your profile.
          </p>
        </div>
        <div className="sg-hero-icon">✦</div>
      </section>

      <section className="sg-action-card">
        <div className="sg-action-icon">◎</div>

        <div className="sg-action-copy">
          <h2>Find your skill gaps</h2>
          <p>
            CareerRAG compares your uploaded resume with your
            target job description to identify areas to improve.
          </p>
          <Link to="/resume-analyzer">
            Manage uploaded documents →
          </Link>
        </div>

        <button
          className="sg-analyze-button"
          onClick={analyzeSkills}
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Analyze skill gaps →"}
        </button>
      </section>

      {loading && (
        <section className="sg-message" role="status">
          <div className="sg-spinner" />
          <h3>Analyzing your skills...</h3>
          <p>Gemini is identifying job-related learning opportunities.</p>
        </section>
      )}

      {error && (
        <section className="sg-error" role="alert">
          <h3>Analysis couldn't be completed</h3>
          <p>{error}</p>
          <button onClick={analyzeSkills}>Try again</button>
        </section>
      )}

      {result && (
        <section className="sg-results">
          <div className="sg-section-heading">
            <div>
              <span className="eyebrow">YOUR RESULTS</span>
              <h2>Skills to strengthen</h2>
            </div>
            <span className="sg-ai-label">✦ AI-generated</span>
          </div>

          <section className="sg-summary-card">
            <span className="sg-summary-icon">✦</span>
            <div>
              <h3>Overall assessment</h3>
              <p>{result.summary || "Your analysis is complete."}</p>
            </div>
          </section>

          <div className="sg-results-heading">
            <h2>Recommended learning areas</h2>
            <span>
              {Array.isArray(result.skill_gaps)
                ? result.skill_gaps.length
                : 0}{" "}
              areas identified
            </span>
          </div>

          {Array.isArray(result.skill_gaps) &&
          result.skill_gaps.length > 0 ? (
            <div className="sg-gap-list">
              {result.skill_gaps.map((gap, index) => (
                <article
                  className="sg-gap-card"
                  key={`${gap.skill || "skill"}-${index}`}
                >
                  <div className="sg-gap-top">
                    <div className="sg-gap-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="sg-gap-title">
                      <h3>{gap.skill || "Skill to strengthen"}</h3>
                      <span className={priorityClass(gap.priority)}>
                        {gap.priority || "Priority not specified"} priority
                      </span>
                    </div>
                  </div>

                  <div className="sg-gap-detail">
                    <h4>Why it matters</h4>
                    <p>
                      {gap.reason ||
                        "This skill was identified as a potential learning area."}
                    </p>
                  </div>

                  <div className="sg-gap-detail">
                    <h4>What to learn</h4>
                    <p>
                      {gap.learning_action ||
                        "Explore the fundamentals and practise with a small project."}
                    </p>
                  </div>

                  <div className="sg-practice-box">
                    <span>✦ PRACTICE TASK</span>
                    <p>
                      {gap.practice_task ||
                        "Build a small project that demonstrates this skill."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="sg-empty">
              <h3>No skill gaps returned</h3>
              <p>
                The analysis didn't identify any gaps. You can still
                review the job description and strengthen your projects.
              </p>
            </div>
          )}

          <p className="sg-disclaimer">
            A skill gap means the uploaded resume does not clearly
            demonstrate that skill. It does not prove that you lack it.
            Review the original job requirements before making decisions.
          </p>

          <button
            className="sg-analyze-button"
            onClick={analyzeSkills}
            disabled={loading}
          >
            Analyze again ↻
          </button>
        </section>
      )}
    </main>
  );
}

