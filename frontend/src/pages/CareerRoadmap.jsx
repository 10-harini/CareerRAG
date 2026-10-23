
import { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

export default function CareerRoadmap() {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateRoadmap() {
    setLoading(true);
    setError("");
    setRoadmap(null);

    try {
      const response = await fetch(`${API_URL}/roadmap`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Could not generate your roadmap."
        );
      }

      setRoadmap(data);
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the backend. Check whether your backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="career-roadmap-page">
      <section className="cr-hero">
        <span className="cr-eyebrow">YOUR CAREER JOURNEY</span>
        <h1>Career Roadmap 🚀</h1>
        <p>
          Turn your career goals into a structured learning plan based on
          your resume and target job description.
        </p>
        <button
          className="cr-generate-button"
          onClick={generateRoadmap}
          disabled={loading}
        >
          {loading ? "Generating roadmap..." : "Generate My Roadmap"}
        </button>
        <p className="cr-note">
          Upload both your resume and job description before generating.
        </p>
      </section>

      {loading && (
        <div className="cr-message">
          Creating your personalized career roadmap. Please wait...
        </div>
      )}

      {error && (
        <div className="cr-error">
          <h3>Unable to generate roadmap</h3>
          <p>{error}</p>
          <Link to="/resume-analyzer">Check uploaded documents →</Link>
        </div>
      )}

      {roadmap && (
        <div className="cr-results">
          <section className="cr-overview">
            <div>
              <span className="cr-label">TARGET ROLE</span>
              <h2>{roadmap.target_role || "Your target career"}</h2>
            </div>
            <div className="cr-hours">
              <span className="cr-label">ESTIMATED LEARNING TIME</span>
              <strong>
                {roadmap.estimated_total_hours ?? "—"} hours
              </strong>
            </div>
          </section>

          <div className="cr-section-heading">
            <h2>Your Weekly Learning Plan</h2>
            <p>Follow each step and track your progress.</p>
          </div>

          <div className="cr-week-list">
            {(roadmap.roadmap || []).map((week, index) => (
              <article
                className="cr-week-card"
                key={`${week.week ?? index}-${week.skill ?? "skill"}`}
              >
                <div className="cr-week-number">
                  Week {week.week ?? index + 1}
                </div>

                <div className="cr-week-content">
                  <h3>{week.skill || "Learning objective"}</h3>

                  <p className="cr-objective">
                    {week.learning_objective}
                  </p>

                  <div className="cr-detail">
                    <strong>⏱ Estimated time</strong>
                    <p>{week.estimated_hours ?? "—"} hours</p>
                  </div>

                  <div className="cr-detail">
                    <strong>💻 Practice task</strong>
                    <p>{week.practice_task}</p>
                  </div>

                  <div className="cr-detail cr-completion">
                    <strong>✅ Completion criteria</strong>
                    <p>{week.completion_criteria}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {roadmap.final_project && (
            <section className="cr-final-project">
              <span className="cr-label">YOUR FINAL MILESTONE</span>
              <h2>🚀 {roadmap.final_project.title}</h2>
              <p>{roadmap.final_project.description}</p>
            </section>
          )}

          {(!roadmap.roadmap || roadmap.roadmap.length === 0) && (
            <p className="cr-message">
              The API returned a roadmap without weekly steps. Check the
              backend response in Swagger.
            </p>
          )}

          <button
            className="cr-generate-button cr-regenerate"
            onClick={generateRoadmap}
            disabled={loading}
          >
            Regenerate Roadmap
          </button>
        </div>
      )}
    </div>
  );
}
