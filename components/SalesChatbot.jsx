// components/SalesBot.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";

export default function SalesChatbot() {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi 👋 How can I help grow your business today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Gracefully cancel in-flight requests on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const appendMessage = useCallback((role, content) => {
    setMessages((prev) => [...prev, { role, content }]);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    appendMessage("user", userMessage);
    setInput("");
    setIsLoading(true);
    setErrorMsg("");

    abortControllerRef.current?.abort(); // cancel any prior pending request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`${backendUrl}/api/salesbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
        signal: controller.signal,
      });

      // Handle rate limit specifically
      if (res.status === 429) {
        appendMessage("assistant", "⚠️ Too many requests. Please wait a moment before trying again.");
        return;
      }

      // Handle other non-OK responses gracefully
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();

      const reply = data?.reply?.trim();
      appendMessage("assistant", reply || "🤔 I'm not sure how to respond to that right now.");
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn("Fetch aborted (component unmounted or new request sent).");
        return;
      }
      console.error("Salesbot error:", error);
      setErrorMsg("Something went wrong. Please try again later.");
      appendMessage(
        "assistant",
        "⚠️ I'm having trouble connecting right now. Please try again in a few seconds."
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, backendUrl, appendMessage, isLoading]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="chatbot-wrapper">
      {!isOpen && (
        <button
          className="chatbot-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
        >
          💬
        </button>
      )}

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>💡 Sales Assistant</span>
            <button
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="chatbot-body">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-msg ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-msg assistant typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            )}
            {errorMsg && <div className="chatbot-error">{errorMsg}</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-footer">
            <input
              className="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Please wait..." : "Ask me anything..."}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
            />
            <button
              className="chatbot-send"
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
