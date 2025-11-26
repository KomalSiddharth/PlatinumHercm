import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, BookOpen, Loader2 } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface GratitudeJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GratitudeJournalDialog({ open, onOpenChange }: GratitudeJournalDialogProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [gratitudeText, setGratitudeText] = useState('');
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'left' | 'right' | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayName = format(currentDate, 'EEEE');
  const displayDate = format(currentDate, 'MMMM d, yyyy');

  // Fetch entry for current date
  const { data: entry, isLoading } = useQuery({
    queryKey: ['/api/gratitude-journal', dateStr],
    enabled: open,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { date: string; gratitudeText: string }) => {
      const res = await apiRequest('/api/gratitude-journal', 'POST', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gratitude-journal'] });
      toast({
        title: "Saved",
        description: "Your gratitude entry has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update text when entry loads
  useEffect(() => {
    if (entry?.gratitudeText !== undefined) {
      setGratitudeText(entry.gratitudeText || '');
    } else {
      setGratitudeText('');
    }
  }, [entry]);

  // Page flip animation
  const flipPage = useCallback((direction: 'prev' | 'next') => {
    setIsFlipping(true);
    setFlipDirection(direction === 'prev' ? 'right' : 'left');
    
    // Save current page before flipping
    if (gratitudeText.trim()) {
      saveMutation.mutate({ date: dateStr, gratitudeText });
    }

    setTimeout(() => {
      if (direction === 'prev') {
        setCurrentDate(prev => subDays(prev, 1));
      } else {
        setCurrentDate(prev => addDays(prev, 1));
      }
      
      setTimeout(() => {
        setIsFlipping(false);
        setFlipDirection(null);
      }, 300);
    }, 300);
  }, [dateStr, gratitudeText, saveMutation]);

  const handleSave = () => {
    saveMutation.mutate({ date: dateStr, gratitudeText });
  };

  const goToToday = () => {
    if (!isToday(currentDate)) {
      setIsFlipping(true);
      setFlipDirection('left');
      
      if (gratitudeText.trim()) {
        saveMutation.mutate({ date: dateStr, gratitudeText });
      }

      setTimeout(() => {
        setCurrentDate(new Date());
        setTimeout(() => {
          setIsFlipping(false);
          setFlipDirection(null);
        }, 300);
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl bg-amber-100 dark:bg-amber-950">
        {/* Book Container */}
        <div className="relative perspective-1000">
          {/* Book Cover / Spine Effect */}
          <div className="absolute -left-2 top-0 bottom-0 w-6 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-600 rounded-l-md shadow-xl z-10" />
          
          {/* Main Book */}
          <div 
            className={`
              relative min-h-[500px] 
              transition-transform duration-300 ease-in-out
              ${isFlipping ? (flipDirection === 'left' ? 'animate-flip-left' : 'animate-flip-right') : ''}
            `}
            style={{
              backgroundColor: '#fef3c7',
              backgroundImage: `
                linear-gradient(to right, rgba(139, 69, 19, 0.15) 0%, transparent 8%),
                repeating-linear-gradient(
                  to bottom,
                  transparent,
                  transparent 31px,
                  rgba(139, 69, 19, 0.12) 31px,
                  rgba(139, 69, 19, 0.12) 32px
                )
              `,
            }}
          >
            {/* Book Header */}
            <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: '#92400e' }}>
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6" style={{ color: '#78350f' }} />
                <h2 className="text-xl font-serif font-bold" style={{ color: '#451a03' }}>
                  Gratitude Journal
                </h2>
              </div>
              {!isToday(currentDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToToday}
                  className="hover:bg-amber-200"
                  style={{ color: '#78350f' }}
                  data-testid="button-goto-today"
                >
                  Go to Today
                </Button>
              )}
            </div>

            {/* Page Content */}
            <div className="p-6 space-y-4">
              {/* Date Header - Styled like handwriting */}
              <div className="text-center border-b-2 pb-4 mb-6" style={{ borderColor: '#b45309' }}>
                <p className="text-3xl font-serif font-bold" style={{ color: '#451a03' }}>
                  {dayName}
                </p>
                <p className="text-lg mt-1" style={{ color: '#78350f' }}>
                  {displayDate}
                </p>
                {isToday(currentDate) && (
                  <span className="inline-block mt-2 px-3 py-1 text-sm rounded-full" style={{ backgroundColor: '#166534', color: '#ffffff' }}>
                    Today
                  </span>
                )}
              </div>

              {/* Gratitude Prompt */}
              <div className="mb-4">
                <p className="italic font-serif text-lg mb-3" style={{ color: '#78350f' }}>
                  What are you grateful for today?
                </p>
              </div>

              {/* Gratitude Text Area */}
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#b45309' }} />
                </div>
              ) : (
                <Textarea
                  value={gratitudeText}
                  onChange={(e) => setGratitudeText(e.target.value)}
                  placeholder="Write your gratitude here... What made you smile today? Who are you thankful for? What small moments brought you joy?"
                  className="min-h-[200px] bg-transparent border-none resize-none font-serif text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                  style={{
                    color: '#1c1917',
                    lineHeight: '32px',
                    backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 31px, rgba(139, 69, 19, 0.15) 31px, rgba(139, 69, 19, 0.15) 32px)',
                    backgroundAttachment: 'local',
                  }}
                  data-testid="input-gratitude-text"
                />
              )}
            </div>

            {/* Page Navigation */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-4">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => flipPage('prev')}
                disabled={isFlipping}
                className="hover:bg-amber-200"
                style={{ color: '#78350f' }}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-8 w-8" />
                <span className="sr-only">Previous Day</span>
              </Button>

              <div className="text-sm font-medium" style={{ color: '#92400e' }}>
                Flip pages to navigate days
              </div>

              <Button
                variant="ghost"
                size="lg"
                onClick={() => flipPage('next')}
                disabled={isFlipping}
                className="hover:bg-amber-200"
                style={{ color: '#78350f' }}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-8 w-8" />
                <span className="sr-only">Next Day</span>
              </Button>
            </div>

            {/* Page Edge Effect - Solid colors */}
            <div className="absolute right-0 top-4 bottom-4 w-1" style={{ backgroundColor: '#d97706' }} />
            <div className="absolute right-1 top-4 bottom-4 w-px" style={{ backgroundColor: '#b45309' }} />
            <div className="absolute right-2 top-4 bottom-4 w-px" style={{ backgroundColor: '#92400e' }} />
          </div>
        </div>

        {/* CSS for flip animation */}
        <style>{`
          @keyframes flipLeft {
            0% { transform: perspective(1000px) rotateY(0deg); }
            50% { transform: perspective(1000px) rotateY(-15deg); }
            100% { transform: perspective(1000px) rotateY(0deg); }
          }
          @keyframes flipRight {
            0% { transform: perspective(1000px) rotateY(0deg); }
            50% { transform: perspective(1000px) rotateY(15deg); }
            100% { transform: perspective(1000px) rotateY(0deg); }
          }
          .animate-flip-left {
            animation: flipLeft 0.6s ease-in-out;
          }
          .animate-flip-right {
            animation: flipRight 0.6s ease-in-out;
          }
          .perspective-1000 {
            perspective: 1000px;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
