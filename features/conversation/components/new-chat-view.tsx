"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { startNewChatWithMessage } from "@/features/home/actions/start-new-chat";
import { toast } from "sonner";
import { ChatEmpty } from "./chat-empty";
import { ChatComposer } from "./chat-composer";

/**
 * Empty "new chat" view shown at `/`.
 *
 * No conversation is created in the database until the user actually sends
 * their first message — just like the real ChatGPT.
 */
export function NewChatView() {
    const router = useRouter();
    const [isSending, setIsSending] = useState(false);

    const handleSend = useCallback(
        async (text: string) => {
            if (isSending) return;
            setIsSending(true);

            try {
                // Create the conversation only now, when the user sends a message
                const conversationId = await startNewChatWithMessage(text);

                // Navigate to the conversation page — the message will be sent
                // by ConversationView via its useChat hook once it mounts.
                // We pass the initial message as a query param so the conversation
                // page can seed it.
                router.push(
                    `/c/${conversationId}?initialMessage=${encodeURIComponent(text)}`,
                );
            } catch (error) {
                console.error("Failed to create conversation:", error);
                toast.error("Could not start a new chat. Please try again.");
                setIsSending(false);
            }
        },
        [isSending, router],
    );

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-3 md:px-4">
                <SidebarTrigger className="shrink-0" />
                <Separator orientation="vertical" className="mx-1 h-4" />
                <h1 className="truncate text-sm font-medium">New Chat</h1>
            </header>

            <ChatEmpty />

            <ChatComposer
                onSend={handleSend}
                isSending={isSending}
                autoFocus
            />
        </div>
    );
}
