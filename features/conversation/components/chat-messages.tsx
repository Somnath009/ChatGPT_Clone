"use client";

import { type UIMessage } from "ai";
import type { ChatStatus } from "ai";

import {
    Conversation,
    ConversationContent,
} from "@/components/ai-elements/conversation";
import {
    Message,
    MessageContent,
    MessageResponse,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import {
    GlobeIcon,
    ClockIcon,
    FileTextIcon,
    SearchIcon,
    CloudSunIcon,
    CheckCircle2Icon,
    Loader2Icon,
} from "lucide-react";

type ChatMessagesProps = {
    messages: UIMessage[];
    status: ChatStatus;
};

/** Maps tool names to a human-friendly label and icon. */
function getToolDisplay(toolName: string) {
    switch (toolName) {
        case "getCurrentDateTime":
            return { label: "Checking current time", icon: ClockIcon };
        case "getWeather":
            return { label: "Checking weather", icon: CloudSunIcon };
        case "webSearch":
            return { label: "Searching the web", icon: SearchIcon };
        case "webScrape":
            return { label: "Reading webpage", icon: FileTextIcon };
        default:
            return { label: `Using ${toolName}`, icon: GlobeIcon };
    }
}

/** Renders a tool invocation indicator (loading spinner while active, green checkmark when complete). */
function ToolInvocationBadge({
    toolName,
    isComplete,
    input,
}: {
    toolName: string;
    isComplete: boolean;
    input: Record<string, unknown>;
}) {
    const { label, icon: Icon } = getToolDisplay(toolName);

    // Show extra context for search queries / weather location
    const detail =
        toolName === "getWeather" && input?.location
            ? ` "${input.location}"`
            : toolName === "webSearch" && input?.query
              ? ` "${input.query}"`
              : toolName === "webScrape" && input?.url
                ? ` ${(input.url as string).replace(/^https?:\/\//, "").slice(0, 40)}…`
                : "";

    return (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground my-1">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">
                {label}
                {detail}
            </span>
            {isComplete ? (
                <CheckCircle2Icon className="ml-auto size-3.5 shrink-0 text-emerald-500" />
            ) : (
                <Loader2Icon className="ml-auto size-3.5 shrink-0 animate-spin text-primary" />
            )}
        </div>
    );
}

/**
 * Renders the conversation message list with markdown responses and tool invocation badges.
 */
export function ChatMessages({ messages, status }: ChatMessagesProps) {
    const isWaiting =
        status === "submitted" && messages.at(-1)?.role === "user";

    const isStreaming = status === "streaming" || status === "submitted";

    return (
        <Conversation>
            <ConversationContent className="py-8">
                {messages.map((message) => (
                    <Message key={message.id} from={message.role}>
                        <MessageContent>
                            {message.parts.map((part, i) => {
                                if (part.type === "text" && part.text) {
                                    return (
                                        <MessageResponse key={`text-${i}`}>
                                            {part.text}
                                        </MessageResponse>
                                    );
                                }
                                // Handle tool calls in AI SDK v7 (type is "tool-{name}" or "dynamic-tool")
                                if (
                                    part.type.startsWith("tool-") ||
                                    part.type === "dynamic-tool"
                                ) {
                                    const p = part as Record<string, unknown>;
                                    const rawToolName = typeof p.toolName === "string"
                                        ? p.toolName
                                        : part.type.replace(/^tool-/, "");
                                    const toolCallId = String(p.toolCallId || i);
                                    const input = (p.input || p.args || {}) as Record<string, unknown>;

                                    // Check if any subsequent part in this message is a text part (model finished tool and is outputting text)
                                    const hasSubsequentText = message.parts
                                        .slice(i + 1)
                                        .some((subPart) => subPart.type === "text" && Boolean(subPart.text));

                                    // Tool is complete if:
                                    // 1. Chat stream is finished (status ready)
                                    // 2. Or subsequent text output exists
                                    // 3. Or output/result/error properties are present
                                    // 4. Or tool state is non-streaming
                                    const isComplete =
                                        !isStreaming ||
                                        hasSubsequentText ||
                                        p.output !== undefined ||
                                        p.result !== undefined ||
                                        p.error !== undefined ||
                                        p.state === "result" ||
                                        p.state === "done" ||
                                        p.state === "output-available" ||
                                        p.state === "input-available" ||
                                        p.state === "call";

                                    return (
                                        <ToolInvocationBadge
                                            key={toolCallId}
                                            toolName={rawToolName}
                                            isComplete={isComplete}
                                            input={input}
                                        />
                                    );
                                }
                                return null;
                            })}
                        </MessageContent>
                    </Message>
                ))}

                {isWaiting ? (
                    <Message from="assistant">
                        <MessageContent>
                            <Loader />
                        </MessageContent>
                    </Message>
                ) : null}
            </ConversationContent>
        </Conversation>
    );
}
