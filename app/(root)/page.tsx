import { NewChatView } from "@/features/conversation/components/new-chat-view";

/**
 * Home page — shows an empty chat UI.
 * A conversation is only created when the user sends their first message.
 */
export default function HomePage() {
    return <NewChatView />;
}
