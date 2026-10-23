
import { useState } from "react";
import "../App.css";

const API_URL = "http://127.0.0.1:8000";

const suggestions = [
  "Explain RAG in simple words.",
  "What skills are missing from my resume?",
  "How can I prepare for an AI/ML interview?",
  "Explain ChromaDB and vector databases.",
];

function CareerChat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI Career Assistant. Ask me about your resume, skills, projects, or interview preparation.",
      sources: [],
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async (messageText = input) => {
    const question = messageText.trim();

    if (!question || loading) return;

    setError("");
    setInput("");
    setLoading(true);

    setMessages((previous) => [
      ...previous,
      { role: "user", content: question, sources: [] },
    ]);

    try {
      const params = new URLSearchParams({
        query: question,
        top_k: "3",
      });

      let response;

      try {
        response = await fetch(`${API_URL}/ask?${params.toString()}`);
      } catch (fetchError) {
        throw new Error(
          "Cannot connect to the backend. Make sure FastAPI is running at http://127.0.0.1:8000 and try again."
        );
      }

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          `The backend returned an invalid response (HTTP ${response.status}).`
        );
      }

      if (!response.ok || result.error || result.detail) {
        throw new Error(
          result.detail ||
            result.error ||
            `Request failed with status ${response.status}.`
        );
      }

      const answer =
        result.answer ||
        result.response ||
        result.message ||
        "I couldn't generate an answer. Please try again.";

      const sources = Array.isArray(result.sources)
        ? result.sources
        : [];

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: answer,
          sources,
        },
      ]);
    } catch (err) {
      const errorMessage =
        err.message || "Something went wrong. Please try again.";

      setError(errorMessage);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: `Sorry, I couldn't answer your question. ${errorMessage}`,
          sources: [],
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const clearChat = () => {
    if (loading) return;

    setMessages([
      {
        role: "assistant",
        content:
          "Chat cleared! Ask me anything about your career, resume, skills, or interview preparation.",
        sources: [],
      },
    ]);

    setError("");
    setInput("");
  };

  return (
    <div className="career-chat-page">
      <div className="career-chat-header">
        <div>
          <h1>AI Career Chat</h1>
          <p>
            Your AI-powered assistant for career guidance and resume questions.
          </p>
        </div>

        <button
          type="button"
          className="clear-chat-btn"
          onClick={clearChat}
          disabled={loading}
        >
          Clear Chat
        </button>
      </div>

      <div className="chat-status">
        <span className="status-dot" />
        Career Assistant
        <span className="status-label">RAG-powered</span>
      </div>

      {error && (
        <div className="chat-error" role="alert">
          <strong>Connection or response error:</strong> {error}
          <p>
            Check that the backend is running and that the /ask endpoint
            is available.
          </p>
        </div>
      )}

      <div className="chat-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={`${index}-${message.role}`}
            className={`chat-message ${
              message.role === "user" ? "user-message" : "assistant-message"
            }`}
          >
            <div className="chat-avatar">
              {message.role === "user" ? "You" : "AI"}
            </div>

            <div className="chat-message-content">
              <div
                className={`chat-bubble ${
                  message.isError ? "error-bubble" : ""
                }`}
              >
                {message.content}
              </div>

              {message.sources && message.sources.length > 0 && (
                <div className="chat-sources">
                  <strong>Sources</strong>

                  {message.sources.map((source, sourceIndex) => {
                    const sourceName =
                      typeof source === "string"
                        ? source
                        : source.filename ||
                          source.source ||
                          source.document ||
                          source.name ||
                          `Source ${sourceIndex + 1}`;

                    return (
                      <div
                        className="chat-source-item"
                        key={`${sourceIndex}-${sourceName}`}
                      >
                        📄 {sourceName}

                        {typeof source === "object" &&
                          source.chunk !== undefined && (
                            <span> · Chunk {source.chunk}</span>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant-message">
            <div className="chat-avatar">AI</div>
            <div className="chat-bubble typing-indicator">
              Thinking
              <span className="typing-dots">...</span>
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="chat-suggestions">
          <p>Try asking</p>

          <div className="suggestion-list">
            {suggestions.map((suggestion) => (
              <button
                type="button"
                className="suggestion-btn"
                key={suggestion}
                onClick={() => sendMessage(suggestion)}
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your resume, skills, projects, or career..."
          rows={2}
          disabled={loading}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              handleSubmit(event);
            }
          }}
        />

        <button
          type="submit"
          className="send-message-btn"
          disabled={loading || !input.trim()}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </form>

      <p className="chat-disclaimer">
        AI-generated responses may occasionally be inaccurate. Verify important
        career advice before acting on it.
      </p>
    </div>
  );
}

export default CareerChat;
