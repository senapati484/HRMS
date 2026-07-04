"use client";

import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTIONS = [
  "How many paid leaves do I have left?",
  "What's my attendance this month?",
  "Show my payroll breakdown",
  "Can I carry forward leaves?",
  "How many sick leaves have I used?",
];

export default function CopilotAsk() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    // Add empty assistant message that will be filled by the stream
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", streaming: true },
    ]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/copilot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `Error: ${errText}` },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // flushSync forces React to re-render immediately for EACH chunk
        // Without this, React 18 batches updates and shows the whole response at once
        flushSync(() => {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: accumulated, streaming: true },
          ]);
        });
      }

      // Mark streaming as done
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: accumulated, streaming: false },
      ]);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    ask(input);
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function clearChat() {
    if (streaming) handleStop();
    setMessages([]);
  }

  return (
    <div
      className="rounded-2xl border flex flex-col"
      style={{
        background: "var(--card)",
        borderColor: "var(--card-border)",
        height: "480px",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--card-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
            }}
          >
            ✨
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm leading-tight">HR Copilot</h2>
            <p className="text-xs leading-tight" style={{ color: "var(--muted)" }}>
              {streaming ? (
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "var(--primary)" }}
                  />
                  Typing...
                </span>
              ) : (
                "Ask anything about your leaves, payroll or policy"
              )}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-xs px-2.5 py-1 rounded-lg transition-colors"
            style={{ color: "var(--muted)", background: "rgba(255,255,255,0.04)" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3"
              style={{ background: "rgba(99,102,241,0.1)" }}
            >
              🤖
            </div>
            <p className="text-sm font-medium text-white mb-1">Your HR Assistant</p>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              I have full context on your leaves, attendance, and payroll. Ask me anything!
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-90"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    color: "var(--primary)",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0 mt-0.5 mr-2"
                    style={{
                      background: "linear-gradient(135deg, var(--primary), var(--accent))",
                    }}
                  >
                    ✨
                  </div>
                )}
                <div
                  className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={
                    msg.role === "user"
                      ? {
                          background: "linear-gradient(135deg, var(--primary), var(--accent))",
                          color: "white",
                          borderBottomRightRadius: "4px",
                        }
                      : {
                          background: "rgba(255,255,255,0.05)",
                          color: "var(--foreground)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderBottomLeftRadius: "4px",
                        }
                  }
                >
                  <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                  {msg.streaming && (
                    <span
                      className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
                      style={{ background: "var(--primary)", verticalAlign: "text-bottom" }}
                    />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Suggestions (only when there are messages) */}
      {messages.length > 0 && !streaming && (
        <div
          className="px-4 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0"
          style={{ scrollbarWidth: "none" }}
        >
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 transition-all"
              style={{
                background: "rgba(99,102,241,0.08)",
                color: "var(--muted)",
                border: "1px solid rgba(99,102,241,0.15)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className="px-4 pb-4 flex-shrink-0 border-t pt-3"
        style={{ borderColor: "var(--card-border)" }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about leaves, payroll, attendance..."
            disabled={streaming}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none disabled:opacity-60 transition-opacity"
            style={{
              background: "#0f1117",
              border: "1px solid var(--card-border)",
            }}
          />
          {streaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "var(--danger)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              ■ Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-all"
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--accent))",
              }}
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
