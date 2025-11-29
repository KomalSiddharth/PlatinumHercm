import { useState, useEffect } from 'react';
import { MessageCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatBubbleProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ChatBubble({ isOpen: controlledOpen, onOpenChange }: ChatBubbleProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpenChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalOpen(open);
    }
    if (open) setIsLoading(true);
  };

  return (
    <>
      {/* Chat Bubble Button - Fixed on right side */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {/* Name label - shows when minimized */}
        {!isOpen && (
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-3 py-2 rounded-full shadow-lg text-sm font-semibold animate-in fade-in slide-in-from-right-2 duration-300">
            Mitesh-AI
          </div>
        )}
        <Button
          onClick={() => handleOpenChange(!isOpen)}
          size="icon"
          className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${
            isOpen 
              ? 'bg-gray-600 hover:bg-gray-700' 
              : 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
          }`}
          data-testid="button-chat-bubble"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white" />
          )}
        </Button>
      </div>

      {/* Chat Window - Opens when bubble is clicked */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-5 fade-in duration-300 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Mitesh-AI</h3>
                <p className="text-white/80 text-sm">Platinum Coach</p>
              </div>
            </div>
            <Button
              onClick={() => handleOpenChange(false)}
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              data-testid="button-close-chat"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 top-16 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm text-muted-foreground">Loading AI Assistant...</p>
              </div>
            </div>
          )}

          {/* Delphi Iframe */}
          <iframe
            src="https://delphi.ai/embeddable/config/00175779-acb8-4580-a7ec-8469446841a4"
            allow="camera *; microphone *"
            style={{ border: 'none', flexGrow: 1, height: '100%', width: '100%' }}
            title="AI Assistant"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      )}
    </>
  );
}
