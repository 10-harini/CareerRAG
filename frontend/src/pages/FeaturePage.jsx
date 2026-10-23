
import { Link } from "react-router-dom";

export default function FeaturePage({ icon, title, description, steps, linkTo, linkLabel }) {
  return (
    <section className="feature-page">
      <div className="feature-page-icon">{icon}</div>
      <span className="eyebrow">CAREERRAG WORKSPACE</span>
      <h1>{title}</h1>
      <p className="feature-page-description">{description}</p>

      <div className="feature-info-card">
        <h2>What you can do here</h2>
        <ul>
          {steps.map((step) => <li key={step}>{step}</li>)}
        </ul>
        {linkTo && (
          <Link to={linkTo} className="primary-button">
            {linkLabel} →
          </Link>
        )}
      </div>
    </section>
  );
}
