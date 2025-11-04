import { useState } from 'react';

export default function SalesChatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  async function sendMessage() {
    if (!input) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);

    const res = await fetch('/api/salesbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });

    const data = await res.json();
    const aiMessage = { sender: 'bot', text: data.reply };
    setMessages(prev => [...prev, aiMessage]);

    setInput('');
  }

  return (
    <div className="chatbot-container">
      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.sender === 'user' ? 'user-msg' : 'bot-msg'}>
            {msg.text}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Ask me anything about getting a custom website..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}