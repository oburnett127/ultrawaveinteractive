// components/SalesBot.jsx
import React, { useState, useEffect, useRef } from "react";

export default function SalesChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi 👋 How can I help grow your business today?" }
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    try {
      const res = await fetch("/api/salesbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      const botReply = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, botReply]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Something went wrong. Please try again." },
      ]);
    }
  };

  return (
    <div style={styles.wrapper}>
      {!isOpen && (
        <button style={styles.fab} onClick={() => setIsOpen(true)}>
          💬
        </button>
      )}
      {isOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.header}>
            <span>💡 Sales Assistant</span>
            <button style={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div style={styles.body}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={msg.role === "assistant" ? styles.botMsg : styles.userMsg}
              >
                {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.footer}>
            <input
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button style={styles.sendBtn} onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: 2000,
  },
  fab: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#0070f3",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: "24px",
    boxShadow: "0px 4px 8px rgba(0,0,0,0.25)",
  },
  chatWindow: {
    width: "350px",
    height: "480px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0px 8px 16px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#0070f3",
    color: "white",
    padding: "12px 16px",
    fontSize: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontSize: "18px",
  },
  body: {
    flex: 1,
    padding: "12px",
    overflowY: "auto",
    backgroundColor: "#fafafa",
  },
  userMsg: {
    alignSelf: "flex-end",
    backgroundColor: "#d1eaff",
    padding: "10px",
    borderRadius: "10px",
    maxWidth: "80%",
    marginBottom: "10px",
  },
  botMsg: {
    alignSelf: "flex-start",
    backgroundColor: "#eeeeee",
    padding: "10px",
    borderRadius: "10px",
    maxWidth: "80%",
    marginBottom: "10px",
  },
  footer: {
    padding: "10px",
    display: "flex",
    gap: "8px",
    borderTop: "1px solid #ddd",
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  sendBtn: {
    backgroundColor: "#0070f3",
    color: "white",
    borderRadius: "6px",
    padding: "10px 14px",
    border: "none",
    cursor: "pointer",
  },
};
