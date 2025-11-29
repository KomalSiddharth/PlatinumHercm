import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    delphi?: {
      page?: {
        config: string;
        overrides?: {
          landingPage?: string;
        };
        container?: {
          selector: string;
          width: string;
          height: string;
        };
      };
    };
  }
}

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !scriptLoadedRef.current) {
      setIsLoading(true);
      setHasError(false);

      // Configure Delphi
      window.delphi = {
        ...(window.delphi ?? {}),
        page: {
          config: "00175779-acb8-4580-a7ec-8469446841a4",
          overrides: {
            landingPage: "OVERVIEW"
          },
          container: {
            selector: "#delphi-bubble-container",
            width: "100%",
            height: "536px"
          }
        }
      };

      // Load Delphi script
      const script = document.createElement('script');
      script.src = 'https://embed.delphi.ai/loader.js';
      script.async = true;
      script.onload = () => {
        console.log('[DELPHI BUBBLE] Script loaded successfully');
        scriptLoadedRef.current = true;
        setTimeout(() => setIsLoading(false), 1000);
      };
      script.onerror = () => {
        console.error('[DELPHI BUBBLE] Failed to load script');
        setHasError(true);
        setIsLoading(false);
      };
      document.body.appendChild(script);
    }
  }, [isOpen]);

  return (
    <>
      {/* Chat Bubble Button - Fixed on right side */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
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
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">AI Assistant</h3>
                <p className="text-white/80 text-sm">Platinum Coach</p>
              </div>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
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

          {/* Error State */}
          {hasError && (
            <div className="absolute inset-0 top-16 flex items-center justify-center bg-white dark:bg-gray-900 p-6 z-10">
              <div className="text-center">
                <p className="text-red-500 mb-2">Failed to load AI Assistant</p>
                <Button 
                  onClick={() => {
                    scriptLoadedRef.current = false;
                    setIsLoading(true);
                    setHasError(false);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Delphi Container */}
          <div 
            id="delphi-bubble-container" 
            ref={containerRef}
            className="w-full h-[536px] bg-white"
          />
        </div>
      )}
    </>
  );
}
