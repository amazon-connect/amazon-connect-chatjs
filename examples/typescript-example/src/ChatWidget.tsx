import "amazon-connect-chatjs"; // imports `window.connect`
import { useEffect, useRef, useState } from "react";

// ChatJS ships its types as an ambient global `namespace connect` (see
// node_modules/amazon-connect-chatjs/dist/index.d.ts). Binding `window.connect`
// to `typeof connect` exposes the full typings instead of `any`.
declare global {
  interface Window {
    connect: typeof connect;
  }
}

// ===== CONFIGURATION =====
const REGION = "<AWS_REGION>"; // e.g. "us-west-2"

// Obtain these by calling StartChatContact yourself (e.g. via the AWS CLI):
/*
aws connect start-chat-contact \
  --instance-id <INSTANCE_ID> \
  --contact-flow-id <CONTACT_FLOW_ID> \
  --participant-details DisplayName="Joe Shmoe" \
  --region <AWS_REGION>
*/
// Then paste the returned values here (or into the inputs in the UI below).
const INITIAL_CHAT_DETAILS = {
  contactId: "",
  participantId: "",
  participantToken: "",
};

interface ChatMessage {
  id: string;
  displayName: string;
  content: string;
}

function ChatWidget() {
  const [chatDetails, setChatDetails] = useState(INITIAL_CHAT_DETAILS);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const chatSessionRef = useRef<connect.CustomerChatSession | null>(null);

  // Configure ChatJS once on mount
  useEffect(() => {
    window.connect.ChatSession.setGlobalConfig({
      loggerConfig: { useDefaultLogger: true },
      region: REGION,
    });
  }, []);

  const renderMessage = (data: connect.ChatMessageEvent["data"]) => {
    if (data.ContentType === "text/plain" || data.ContentType === "text/markdown") {
      setMessages((prev) => [
        ...prev,
        {
          id: data.Id,
          displayName: data.DisplayName || "System",
          content: data.Content ?? "",
        },
      ]);
    }
  };

  const initializeChat = async () => {
    setConnecting(true);
    try {
      // Step 1: Initialize the ChatJS client with manually-obtained chatDetails
      const customerChatSession = window.connect.ChatSession.create({
        chatDetails: {
          contactId: chatDetails.contactId,
          participantId: chatDetails.participantId,
          participantToken: chatDetails.participantToken,
        },
        options: { region: REGION },
        type: "CUSTOMER",
        disableCSM: true, // CSM is an internal feature, safe to disable
      });
      chatSessionRef.current = customerChatSession;

      // Step 2: Add event handlers
      customerChatSession.onConnectionEstablished(() => {
        console.log("[customerChatSession] Connected to WebSocket API");
        setConnected(true);
      });
      customerChatSession.onMessage((event) => renderMessage(event.data));

      // Step 3: Connect the ChatJS session
      const connectionResult = await customerChatSession.connect();
      if (!connectionResult.connectSuccess) {
        throw new Error("chatSession.connect() failed");
      }

      // Send an initial message
      await customerChatSession.sendMessage({
        contentType: "text/plain",
        message: "Hello, I'm connected!",
      });
    } catch (error) {
      console.error("Chat initialization error:", error);
      alert("[ChatJS] Failed to initialize. Please check your region and chatDetails.");
    } finally {
      setConnecting(false);
    }
  };

  const sendMessage = async () => {
    const message = draft.trim();
    if (message && chatSessionRef.current) {
      await chatSessionRef.current.sendMessage({ contentType: "text/plain", message });
      setDraft("");
    }
  };

  const endChat = async () => {
    if (chatSessionRef.current) {
      await chatSessionRef.current.disconnectParticipant();
      chatSessionRef.current = null;
    }
    setConnected(false);
    setMessages([]);
  };

  return (
    <div style={{ maxWidth: 600, margin: "20px auto", fontFamily: "Arial, sans-serif" }}>
      {!connected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
          <input
            placeholder="ContactId"
            value={chatDetails.contactId}
            onChange={(e) => setChatDetails({ ...chatDetails, contactId: e.target.value })}
            style={{ padding: 5 }}
          />
          <input
            placeholder="ParticipantId"
            value={chatDetails.participantId}
            onChange={(e) => setChatDetails({ ...chatDetails, participantId: e.target.value })}
            style={{ padding: 5 }}
          />
          <input
            placeholder="ParticipantToken"
            value={chatDetails.participantToken}
            onChange={(e) => setChatDetails({ ...chatDetails, participantToken: e.target.value })}
            style={{ padding: 5 }}
          />
          <button onClick={initializeChat} disabled={connecting}>
            {connecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      )}

      {connected && (
        <>
          <div style={{ marginBottom: 10 }}>
            <button onClick={endChat}>End Chat</button>
          </div>

          <div
            style={{
              border: "1px solid #ccc",
              padding: 10,
              height: 300,
              overflowY: "auto",
            }}
          >
            {messages.map((m) => (
              <p key={m.id} style={{ margin: "5px 0", padding: 5 }}>
                {m.displayName}: {m.content}
              </p>
            ))}
          </div>

          <div style={{ display: "flex", marginTop: 10 }}>
            <input
              type="text"
              placeholder="Type your message..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              style={{ flexGrow: 1, marginRight: 5, padding: 5 }}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatWidget;
