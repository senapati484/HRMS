"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, MessageSquare, StopCircle, RefreshCw, Send } from "lucide-react";

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

// Lightweight React component to format Markdown nicely without adding heavy dependencies
function MarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;

  // Split lines
  const lines = text.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        let cleanLine = line.trim();

        // 1. Headings
        if (cleanLine.startsWith("### ")) {
          return (
            <h4 key={idx} className="text-sm font-bold text-white mt-3 mb-1 font-precise">
              {cleanLine.replace("### ", "")}
            </h4>
          );
        }
        if (cleanLine.startsWith("## ")) {
          return (
            <h3 key={idx} className="text-sm font-extrabold text-white mt-4 mb-2 border-b border-white/5 pb-1 font-precise">
              {cleanLine.replace("## ", "")}
            </h3>
          );
        }
        if (cleanLine.startsWith("• ") || cleanLine.startsWith("* ")) {
          const content = cleanLine.replace(/^[•*]\s+/, "");
          return (
            <div key={idx} className="flex gap-2 text-sm pl-2">
              <span className="text-indigo-400">•</span>
              <span className="flex-1">{formatBoldItalic(content)}</span>
            </div>
          );
        }

        // Default paragraph
        if (cleanLine === "") return <div key={idx} className="h-1" />;
        return <p key={idx} className="text-sm">{formatBoldItalic(cleanLine)}</p>;
      })}
    </div>
  );
}

// Inline helper to parse **bold** and `code` formats
function formatBoldItalic(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded text-xs bg-slate-950/80 font-mono text-indigo-300 border border-white/5">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function CopilotAsk() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accumulatedRef = useRef("");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim() || streaming) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setStreaming(true);
    accumulatedRef.current = "";

    // Append empty assistant bubble
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

      function scheduleFrame() {
        rafRef.current = requestAnimationFrame(() => {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: accumulatedRef.current, streaming: true },
          ]);
        });
      }

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedRef.current += chunk;
        scheduleFrame();
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: accumulatedRef.current, streaming: false },
      ]);
    } catch (err: any) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (err?.name === "AbortError") {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: accumulatedRef.current || "Stopped.", streaming: false },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
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
    accumulatedRef.current = "";
  }

  return (
    <div
      className="rounded-2xl border flex flex-col glass-panel"
      style={{
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
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm leading-tight font-precise">HR Copilot</h2>
            <p className="text-xs leading-tight mt-0.5" style={{ color: "var(--muted)" }}>
              {streaming ? (
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <RefreshCw size={10} className="animate-spin" />
                  AI is typing...
                </span>
              ) : (
                "Instant database Q&A support"
              )}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-colors hover:bg-white/10 cursor-pointer font-precise"
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
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-400 mb-3"
              style={{ background: "rgba(99,102,241,0.1)" }}
            >
              <MessageSquare size={24} />
            </div>
            <p className="text-sm font-bold text-white mb-1 font-precise">AI HR Copilot Assistant</p>
            <p className="text-xs mb-5 max-w-[280px]" style={{ color: "var(--muted)" }}>
              I have live database access to your profile, attendance history, payroll, and leave limits.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-[340px]">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all hover:bg-indigo-500/20 cursor-pointer"
                  style={{
                    background: "rgba(99,102,241,0.08)",
                    color: "var(--primary)",
                    border: "1px solid rgba(99,102,241,0.15)",
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
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-indigo-300 flex-shrink-0 mt-1 mr-2"
                    style={{
                      background: "rgba(99,102,241,0.15)",
                    }}
                  >
                    <Sparkles size={12} />
                  </div>
                )}
                <div
                  className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={
                    msg.role === "user"
                      ? {
                          background: "linear-gradient(135deg, var(--primary), var(--accent))",
                          color: "white",
                          borderBottomRightRadius: "4px",
                        }
                      : {
                          background: "rgba(255,255,255,0.03)",
                          color: "var(--foreground)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderBottomLeftRadius: "4px",
                        }
                  }
                >
                  {msg.role === "user" ? (
                    <span className="white-space-pre-wrap">{msg.content}</span>
                  ) : (
                    <MarkdownRenderer text={msg.content} />
                  )}
                  {msg.streaming && (
                    <span
                      className="inline-block w-1.5 h-3 ml-1 animate-pulse bg-indigo-400"
                      style={{ verticalAlign: "baseline" }}
                    />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Quick suggestions when not streaming */}
      {messages.length > 0 && !streaming && (
        <div
          className="px-4 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0"
          style={{ scrollbarWidth: "none" }}
        >
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 transition-all hover:bg-white/5 cursor-pointer"
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
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "var(--danger)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <StopCircle size={14} /> Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--accent))",
              }}
            >
              <Send size={14} /> Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
