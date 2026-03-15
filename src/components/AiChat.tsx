"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Square, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const projectId = pathname.match(/\/dashboard\/projects\/([^/]+)/)?.[1];

  const { messages, sendMessage, addToolApprovalResponse, status, stop } =
    useChat({
      transport: new DefaultChatTransport({
        api: "/api/chat",
        body: {
          context: { projectId, route: pathname },
        },
      }),
      sendAutomaticallyWhen:
        lastAssistantMessageIsCompleteWithApprovalResponses,
      onFinish: () => {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["project-stats"] });
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: ["board", projectId] });
        }
      },
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
        title="Open AI assistant"
      >
        <MessageCircle size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[500px] bg-popover border border-border rounded-lg shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium text-foreground">
          Retrack AI
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Ask me to manage your projects, items, sections, and more.
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="text-sm">
            <span className="font-medium text-foreground">
              {message.role === "user" ? "You" : "AI"}:
            </span>{" "}
            {message.parts.map((part, i) => {
              const key = `${message.id}-${i}`;

              if (part.type === "text") {
                return (
                  <span key={key} className="text-foreground whitespace-pre-wrap">
                    {part.text}
                  </span>
                );
              }

              // Handle all tool parts generically
              if (part.type.startsWith("tool-") && "state" in part) {
                const toolPart = part as any;

                if (toolPart.state === "approval-requested") {
                  return (
                    <div
                      key={key}
                      className="my-2 p-2 rounded border border-destructive/30 bg-destructive/5"
                    >
                      <p className="text-xs text-muted-foreground mb-2">
                        Confirm destructive action?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() =>
                            addToolApprovalResponse({
                              id: toolPart.approval.id,
                              approved: true,
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() =>
                            addToolApprovalResponse({
                              id: toolPart.approval.id,
                              approved: false,
                            })
                          }
                        >
                          Deny
                        </Button>
                      </div>
                    </div>
                  );
                }

                if (toolPart.state === "output-denied") {
                  return (
                    <div key={key} className="my-1 text-xs text-muted-foreground">
                      Action denied.
                    </div>
                  );
                }

                if (
                  toolPart.state === "input-available" ||
                  toolPart.state === "input-streaming"
                ) {
                  return (
                    <div
                      key={key}
                      className="my-1 text-xs text-muted-foreground italic"
                    >
                      Executing...
                    </div>
                  );
                }
                if (toolPart.state === "output-available") {
                  return (
                    <div
                      key={key}
                      className="my-1 text-xs text-emerald-600 dark:text-emerald-400"
                    >
                      Done
                    </div>
                  );
                }
                if (toolPart.state === "output-error") {
                  return (
                    <div key={key} className="my-1 text-xs text-destructive">
                      Error: {toolPart.errorText}
                    </div>
                  );
                }
              }

              return null;
            })}
          </div>
        ))}
        {status === "submitted" && (
          <div className="text-xs text-muted-foreground italic">Thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && status === "ready") {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            disabled={status !== "ready" && status !== "error"}
            className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          {status === "streaming" || status === "submitted" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0"
              onClick={() => stop()}
            >
              <Square size={14} />
            </Button>
          ) : (
            <Button
              type="submit"
              size="sm"
              className="h-9 w-9 p-0"
              disabled={!input.trim()}
            >
              <Send size={14} />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
