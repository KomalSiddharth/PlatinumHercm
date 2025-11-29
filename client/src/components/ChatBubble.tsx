import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Bubble Trigger */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-chat-bubble"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </Button>

      {/* Chat Bubble Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-96 bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col z-50">
          <div className="bg-red-600 text-white p-4 rounded-t-lg">
            <h3 className="font-semibold">Chat with Delphi AI</h3>
            <p className="text-xs opacity-90">Get personalized guidance</p>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-slate-800">
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <iframe
                src="https://embed.delphi.ai/chat?config=00175779-acb8-4580-a7ec-8469446841a4"
                className="w-full h-full border-0"
                allow="camera *; microphone *"
                style={{ minHeight: '300px' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
