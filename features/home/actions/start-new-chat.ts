"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";

/**
 * Creates a new conversation AND saves the first user message in one atomic operation.
 * Only called when the user actually sends a message from the empty chat UI.
 *
 * @param firstMessageText - The text of the first user message.
 * @returns The new conversation ID.
 */
export async function startNewChatWithMessage(firstMessageText: string) {
    const user = await requireUser();

    const title = firstMessageText.trim().slice(0, 48) || "New Chat";

    const conversation = await prisma.conversation.create({
        data: {
            userId: user.id,
            title,
        },
    });

    return conversation.id;
}
