
import { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

export default function JobMatch() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyzeMatch() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/match`);

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (
        data.match_percentage === undefined ||
        data.match_percentage === null ||
        !Number.isFinite(Number(data.match_percentage))
      ) {
        throw new Error(
          "The backend did not return a valid match score. Please check your uploaded documents and try again."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to CareerRAG. Make sure your backend is running at http://127.0.0.1:8000."
          : err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="job-match-page">
      <section className="jm-hero">
        <div>
          <span className="eyebrow">AI-POWERED CAREER INSIGHTS</span>
          <h1>Resume &amp; Job Match</h1>
          <p>
            Discover how well your resume aligns with your target role,
            identify skill gaps, and find your next steps.
          </p>
        </div>

        <div className="jm-hero-icon" aria-hidden="true">
          ◎
        </div>
      </section>

      {!result && !loading && (
        <section className="jm-action-card">
          <div className="jm-action-icon">✦</div>

          <div className="jm-action-copy">
            <h2>Ready to analyze your match?</h2>
            <p>
              CareerRAG compares your uploaded resume and job description
              using AI. Upload both documents before running the analysis.
            </p>

            <Link to="/resume-analyzer" className="jm-upload-link">
              Go to document uploads →
            </Link>
          </div>

          <button
            className="jm-analyze-button"
            onClick={analyzeMatch}
            disabled={loading}
          >
            Analyze my match →
          </button>
        </section>
      )}

      {loading && (
        <div className="jm-message" role="status" aria-live="polite">
          <div className="jm-spinner" />
          <h3>Analyzing your documents</h3>
          <p>Gemini is comparing your resume with the job description.</p>
        </div>
      )}

      {error && (
        <div className="jm-error" role="alert">
          <strong>Analysis couldn't be completed</strong>
          <p>{error}</p>

          <div className="jm-error-actions">
            <Link to="/resume-analyzer" className="jm-upload-link">
              Check document uploads →
            </Link>

            <button
              className="jm-analyze-button"
              onClick={analyzeMatch}
              disabled={loading}
            >
              Try again ↻
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="jm-results">
          <div className="jm-section-title">
            <div>
              <span className="eyebrow">YOUR RESULTS</span>
              <h2>Match analysis</h2>
            </div>

            <span className="jm-ai-label">✦ AI-generated insights</span>
          </div>

          <section className="jm-score-card">
            <div
              className="jm-score-ring"
              style={{
                "--match-score": `${Math.max(
                  0,
                  Math.min(100, Number(result.match_percentage))
                )}%`,
              }}
              role="img"
              aria-label={`Resume match score: ${Math.max(
                0,
                Math.min(100, Number(result.match_percentage))
              )}%`}
            >
              <div>
                <strong>
                  {Math.max(
                    0,
                    Math.min(100, Number(result.match_percentage))
                  )}
                  %
                </strong>
                <span>Match score</span>
              </div>
            </div>

            <div className="jm-score-copy">
              <h3>Your resume compatibility</h3>
              <p>
                {result.explanation ||
                  "Your AI-generated resume and job comparison is ready."}
              </p>

              <small>
                This is an approximate assessment of evidence in your resume,
                not a probability of getting hired.
              </small>
            </div>
          </section>

          <div className="jm-skill-grid">
            <section className="jm-result-card">
              <div className="jm-card-heading">
                <span className="jm-mini-icon jm-green">✓</span>

                <div>
                  <h3>Matching skills</h3>
                  <p>Skills supported by your resume</p>
                </div>

                <span className="jm-count">
                  {Array.isArray(result.matching_skills)
                    ? result.matching_skills.length
                    : 0}
                </span>
              </div>

              {Array.isArray(result.matching_skills) &&
              result.matching_skills.length > 0 ? (
                <div className="jm-skill-list">
                  {result.matching_skills.map((item, index) => {
                    const skill =
                      typeof item === "string" ? item : item?.skill;
                    const evidence =
                      typeof item === "string" ? "" : item?.evidence;

                    return (
                      <div
                        className="jm-skill-item"
                        key={`${skill || "skill"}-${index}`}
                      >
                        <strong>✓ {skill || "Skill"}</strong>
                        {evidence && <p>{evidence}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="jm-empty">
                  No matching skills were returned by the analysis.
                </p>
              )}
            </section>

            <section className="jm-result-card">
              <div className="jm-card-heading">
                <span className="jm-mini-icon jm-orange">!</span>

                <div>
                  <h3>Skills to strengthen</h3>
                  <p>Skills not clearly evidenced in your resume</p>
                </div>

                <span className="jm-count">
                  {Array.isArray(result.missing_skills)
                    ? result.missing_skills.length
                    : 0}
                </span>
              </div>

              {Array.isArray(result.missing_skills) &&
              result.missing_skills.length > 0 ? (
                <div className="jm-skill-list">
                  {result.missing_skills.map((item, index) => {
                    const skill =
                      typeof item === "string" ? item : item?.skill;
                    const reason =
                      typeof item === "string" ? "" : item?.reason;

                    return (
                      <div
                        className="jm-skill-item"
                        key={`${skill || "skill"}-${index}`}
                      >
                        <strong>○ {skill || "Skill"}</strong>
                        {reason && <p>{reason}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="jm-empty">
                  No missing skills were returned by the analysis.
                </p>
              )}
            </section>
          </div>

          <section className="jm-result-card jm-recommendations">
            <div className="jm-card-heading">
              <span className="jm-mini-icon jm-purple">✦</span>

              <div>
                <h3>Your recommended next steps</h3>
                <p>Suggestions based on this comparison</p>
              </div>
            </div>

            {Array.isArray(result.recommendations) &&
            result.recommendations.length > 0 ? (
              <ol>
                {result.recommendations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ol>
            ) : (
              <p className="jm-empty">
                No recommendations were returned.
              </p>
            )}
          </section>

          <p className="jm-disclaimer">
            Results depend on the content of the uploaded documents and
            the AI-generated comparison. Verify important requirements
            against the original job description.
          </p>

          <div className="jm-results-actions">
            <button
              className="jm-analyze-button"
              onClick={analyzeMatch}
              disabled={loading}
            >
              Analyze again ↻
            </button>

            <Link to="/resume-analyzer" className="jm-upload-link">
              Update documents →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
