import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatBubbleContextType {
  isChatBubbleOpen: boolean;
  setChatBubbleOpen: (open: boolean) => void;
}

const ChatBubbleContext = createContext<ChatBubbleContextType | undefined>(undefined);

export function ChatBubbleProvider({ children }: { children: ReactNode }) {
  const [isChatBubbleOpen, setChatBubbleOpen] = useState(false);

  return (
    <ChatBubbleContext.Provider value={{ isChatBubbleOpen, setChatBubbleOpen }}>
      {children}
    </ChatBubbleContext.Provider>
  );
}

export function useChatBubble() {
  const context = useContext(ChatBubbleContext);
  if (context === undefined) {
    throw new Error('useChatBubble must be used within a ChatBubbleProvider');
  }
  return context;
}
