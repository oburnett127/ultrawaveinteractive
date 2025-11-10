// components/SalesBot.jsx
import React, { useState, useEffect, useRef } from "react";

export default function SalesChatbot() {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi 👋 How can I help grow your business today?" },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    try {
      const res = await fetch(`${backendUrl}/api/salesbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      if (res.status === 429) {
        console.warn("Rate limited. Backing off.");
        return; // don't retry immediately
      }
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "⚠️ No response from bot" },
      ]);
    } catch (error) {
      console.error("Salesbot error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Something went wrong. Please try again later." },
      ]);
    }
  };

  // Send message on Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="chatbot-wrapper">
      {!isOpen && (
        <button className="chatbot-fab" onClick={() => setIsOpen(true)}>
          💬
        </button>
      )}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>💡 Sales Assistant</span>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="chatbot-body">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-msg ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-footer">
            <input
              className="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              onKeyDown={handleKeyPress}
            />
            <button className="chatbot-send" onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
