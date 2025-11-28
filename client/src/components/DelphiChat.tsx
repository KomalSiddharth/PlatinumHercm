import { useState, useEffect } from 'react';
import { MessageCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DELPHI_CONFIG_ID = "00175779-acb8-4580-a7ec-8469446841a4";

export default function DelphiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
          style={{ backgroundColor: '#bc0000' }}
          data-testid="button-delphi-chat"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-background rounded-lg shadow-2xl border border-border overflow-hidden flex flex-col">
          <div 
            className="flex items-center justify-between p-3 border-b"
            style={{ backgroundColor: '#bc0000' }}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-white" />
              <span className="font-semibold text-white">Delphi AI Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-white hover:bg-white/20"
              data-testid="button-close-delphi"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <iframe
              src={`https://embed.delphi.ai/${DELPHI_CONFIG_ID}?display=embed`}
              className="w-full h-full border-0"
              allow="microphone"
              title="Delphi AI Chat"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
