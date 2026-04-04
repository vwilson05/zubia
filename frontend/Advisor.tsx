import React, { useState, useRef, useEffect } from "react";
import { Icons } from "./Icons";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Advisor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Should I apply to my top-scored listing?",
    "Compare my top 3 listings",
    "Is the Mountain View listing a good deal?",
    "What should I ask the landlord during a tour?",
    "How competitive is the Bay Area rental market right now?",
    "Which listing is best for a family with pets?",
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble responding. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div className="page advisor-page">
      <div className="page-header">
        <div>
          <h1>AI Advisor</h1>
          <p className="text-secondary">Ask anything about your listings, neighborhoods, or the market</p>
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="chat-welcome-icon"><Icons.Advisor /></div>
              <h2>Hi! I am your rental advisor.</h2>
              <p className="text-secondary">
                I know all your saved listings, scores, and preferences. Ask me anything.
              </p>
              <div className="chat-suggestions">
                {suggestions.map((s, i) => (
                  <button key={i} className="suggestion-btn" onClick={() => sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === "user" ? "Y" : <Icons.Advisor />}
              </div>
              <div className="message-content">
                {msg.content.split("\n").map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message assistant">
              <div className="message-avatar"><Icons.Advisor /></div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-row">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && sendMessage(input)}
              placeholder="Ask about your listings, neighborhoods, market..."
              className="input-field chat-input"
              disabled={loading}
            />
            <button
              className="btn btn-primary"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
            >
              <Icons.Send />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
