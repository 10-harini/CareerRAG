
import { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

export default function InterviewCoach() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [evaluating, setEvaluating] = useState({});

  async function generateQuestions() {
    setLoading(true);
    setError("");
    setData(null);
    setAnswers({});
    setEvaluations({});

    try {
      const response = await fetch(`${API_URL}/interview-questions`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || result.error || "Could not generate questions."
        );
      }

      setData(result);
    } catch (err) {
      setError(err.message || "Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  async function evaluateAnswer(question, index) {
    const answer = answers[index]?.trim();

    if (!answer) {
      setError(`Please write your answer to Question ${index + 1} first.`);
      return;
    }

    setError("");
    setEvaluating((previous) => ({ ...previous, [index]: true }));

    try {
      const response = await fetch(`${API_URL}/evaluate-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || result.error || "Could not evaluate your answer."
        );
      }

      setEvaluations((previous) => ({ ...previous, [index]: result }));
    } catch (err) {
      setError(err.message || "Unable to evaluate your answer.");
    } finally {
      setEvaluating((previous) => ({ ...previous, [index]: false }));
    }
  }

  return (
    <div className="interview-coach-page">
      <section className="ic-hero">
        <span className="ic-eyebrow">PRACTICE • IMPROVE • SUCCEED</span>
        <h1>AI Interview Coach 🎤</h1>
        <p>
          Practice technical, project-based, and behavioral questions
          tailored to your resume and target job description.
        </p>
        <button
          className="ic-primary-button"
          onClick={generateQuestions}
          disabled={loading}
        >
          {loading ? "Preparing questions..." : "Generate Interview Questions"}
        </button>
        <p className="ic-note">
          Upload your resume and job description first.
        </p>
      </section>

      {loading && (
        <p className="ic-message">Your interview questions are being prepared...</p>
      )}

      {error && (
        <div className="ic-error">
          <p>{error}</p>
          <Link to="/resume-analyzer">Check your uploaded documents →</Link>
        </div>
      )}

      {data && (
        <section className="ic-results">
          <div className="ic-role-card">
            <span className="ic-eyebrow">YOUR TARGET ROLE</span>
            <h2>{data.target_role || "Interview Practice"}</h2>
            <p>{data.questions?.length || 0} questions to practice</p>
          </div>

          {data.questions?.map((item, index) => (
            <article className="ic-question-card" key={index}>
              <div className="ic-question-top">
                <span className="ic-question-number">
                  QUESTION {index + 1}
                </span>
                <span className="ic-category">
                  {item.category || "General"}
                </span>
              </div>

              <h3>{item.question}</h3>

              <label className="ic-answer-label" htmlFor={`answer-${index}`}>
                Your answer
              </label>

              <textarea
                id={`answer-${index}`}
                value={answers[index] || ""}
                onChange={(event) =>
                  setAnswers((previous) => ({
                    ...previous,
                    [index]: event.target.value,
                  }))
                }
                placeholder="Write your answer in your own words..."
                rows={5}
              />

              <button
                className="ic-primary-button"
                onClick={() => evaluateAnswer(item.question, index)}
                disabled={Boolean(evaluating[index])}
              >
                {evaluating[index] ? "Evaluating..." : "Evaluate My Answer"}
              </button>

              {evaluations[index] && (
                <div className="ic-feedback">
                  <div className="ic-score">
                    <span>AI Feedback Score</span>
                    <strong>{evaluations[index].score}/10</strong>
                  </div>

                  <h4>What you did well</h4>
                  {evaluations[index].strengths?.length ? (
                    <ul>
                      {evaluations[index].strengths.map((strength, i) => (
                        <li key={i}>{strength}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No strengths were returned.</p>
                  )}

                  <h4>Areas to improve</h4>
                  {evaluations[index].improvements?.length ? (
                    <ul>
                      {evaluations[index].improvements.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No improvement suggestions were returned.</p>
                  )}

                  <h4>Feedback</h4>
                  <p>{evaluations[index].feedback}</p>

                  <h4>Sample answer</h4>
                  <p className="ic-sample-answer">
                    {evaluations[index].sample_answer}
                  </p>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
