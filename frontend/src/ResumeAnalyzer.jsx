
import { useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function ResumeAnalyzer() {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("resume");
  const [message, setMessage] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setUploadResult(null);
      setMessage("Please select a PDF file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);

    try {
      setLoading(true);
      setMessage("");
      setUploadResult(null);

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || result.error || "Upload failed."
        );
      }

      setUploadResult(result);
    } catch (error) {
      setMessage(
        `Error: ${error.message || "Unable to connect to the server."}`
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] || null;

    setFile(selectedFile);
    setMessage("");
    setUploadResult(null);

    if (selectedFile && selectedFile.type !== "application/pdf") {
      setFile(null);
      setMessage("Please select a valid PDF file.");
      event.target.value = "";
    }
  }

  return (
    <section className="analyzer">
      <p className="eyebrow">DOCUMENT INTELLIGENCE</p>

      <h2>Resume Analyzer</h2>

      <p>
        Upload a resume or job description PDF to CareerRAG.
        Your document will be processed by the AI backend.
      </p>

      <form onSubmit={handleUpload} className="upload-form">
        <label htmlFor="document-type">Document type</label>

        <select
          id="document-type"
          value={documentType}
          onChange={(event) => {
            setDocumentType(event.target.value);
            setMessage("");
            setUploadResult(null);
          }}
        >
          <option value="resume">Resume</option>
          <option value="job-description">Job Description</option>
        </select>

        <label htmlFor="pdf-file">Choose a PDF</label>

        <input
          id="pdf-file"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
        />

        {file && (
          <p className="selected-file">
            Selected: {file.name}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Uploading document..." : "Upload Document"}
        </button>
      </form>

      {loading && (
        <p className="upload-loading" role="status">
          Please wait while CareerRAG processes your document.
        </p>
      )}

      {uploadResult && (
        <div className="upload-success" role="status">
          <div className="success-heading">
            <span className="success-check">✓</span>
            <div>
              <h3>Document uploaded successfully!</h3>
              <p>Your document has been processed by CareerRAG.</p>
            </div>
          </div>

          <div className="result-file">
            <span className="file-icon">PDF</span>
            <div className="file-details">
              <strong>{uploadResult.filename || file?.name}</strong>
              <span>
                {uploadResult.document_type === "job-description"
                  ? "Job Description"
                  : "Resume"}
              </span>
            </div>
          </div>

          <div className="result-stats">
            <div className="result-stat">
              <strong>{uploadResult.pages ?? "—"}</strong>
              <span>Pages</span>
            </div>

            <div className="result-stat">
              <strong>
                {uploadResult.text_length?.toLocaleString() ?? "—"}
              </strong>
              <span>Characters extracted</span>
            </div>

            <div className="result-stat">
              <strong>{uploadResult.number_of_chunks ?? "—"}</strong>
              <span>Chunks stored</span>
            </div>
          </div>

          <p className="result-message">
            {uploadResult.message || "Your document is ready."}
          </p>
        </div>
      )}

      {message && (
        <div className="upload-error" role="alert">
          <strong>Upload unsuccessful</strong>
          <p>{message}</p>
        </div>
      )}
    </section>
  );
}

export default ResumeAnalyzer;
