import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, BookOpen, Loader2, CalendarIcon, X, Check } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface GratitudeJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GratitudeCheckpoint {
  id: string;
  text: string;
  completed: boolean;
}

export function GratitudeJournalDialog({ open, onOpenChange }: GratitudeJournalDialogProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checkpoints, setCheckpoints] = useState<GratitudeCheckpoint[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'left' | 'right' | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayName = format(currentDate, 'EEEE');
  const displayDate = format(currentDate, 'MMM d, yyyy');

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
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Parse checkpoints from stored text (JSON format)
  const parseCheckpoints = (text: string): GratitudeCheckpoint[] => {
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Legacy format: plain text, convert to single checkpoint
      if (text.trim()) {
        return [{ id: Date.now().toString(), text: text.trim(), completed: false }];
      }
    }
    return [];
  };

  // Convert checkpoints to stored format
  const serializeCheckpoints = (items: GratitudeCheckpoint[]): string => {
    return JSON.stringify(items);
  };

  // Update checkpoints when entry loads
  useEffect(() => {
    if (entry?.gratitudeText !== undefined) {
      setCheckpoints(parseCheckpoints(entry.gratitudeText || ''));
    } else {
      setCheckpoints([]);
    }
  }, [entry]);

  // Auto-save when checkpoints change
  const saveCheckpoints = useCallback((items: GratitudeCheckpoint[]) => {
    const serialized = serializeCheckpoints(items);
    saveMutation.mutate({ date: dateStr, gratitudeText: serialized });
  }, [dateStr, saveMutation]);

  // Add new checkpoint on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newItemText.trim()) {
      e.preventDefault();
      const newCheckpoint: GratitudeCheckpoint = {
        id: Date.now().toString(),
        text: newItemText.trim(),
        completed: false,
      };
      const updated = [...checkpoints, newCheckpoint];
      setCheckpoints(updated);
      setNewItemText('');
      saveCheckpoints(updated);
      
      // Keep focus on input
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  // Toggle checkpoint completion
  const toggleCheckpoint = (id: string) => {
    const updated = checkpoints.map(cp => 
      cp.id === id ? { ...cp, completed: !cp.completed } : cp
    );
    setCheckpoints(updated);
    saveCheckpoints(updated);
  };

  // Delete checkpoint
  const deleteCheckpoint = (id: string) => {
    const updated = checkpoints.filter(cp => cp.id !== id);
    setCheckpoints(updated);
    saveCheckpoints(updated);
  };

  // Page flip animation
  const flipPage = useCallback((direction: 'prev' | 'next') => {
    setIsFlipping(true);
    setFlipDirection(direction === 'prev' ? 'right' : 'left');

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
  }, []);

  // Navigate to specific date from calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setIsFlipping(true);
      setFlipDirection('left');
      
      setTimeout(() => {
        setCurrentDate(date);
        setCalendarOpen(false);
        setTimeout(() => {
          setIsFlipping(false);
          setFlipDirection(null);
        }, 300);
      }, 300);
    }
  };

  const goToToday = () => {
    if (!isToday(currentDate)) {
      setIsFlipping(true);
      setFlipDirection('left');

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
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl bg-amber-100 dark:bg-amber-950">
        {/* Book Container */}
        <div className="relative perspective-1000">
          {/* Book Cover / Spine Effect */}
          <div className="absolute -left-2 top-0 bottom-0 w-6 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-600 rounded-l-md shadow-xl z-10" />
          
          {/* Main Book */}
          <div 
            className={`
              relative min-h-[450px] 
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
            {/* Compact Header with Date Picker */}
            <div className="flex items-center justify-between p-3 border-b-2" style={{ borderColor: '#92400e' }}>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" style={{ color: '#78350f' }} />
                <h2 className="text-lg font-serif font-bold" style={{ color: '#451a03' }}>
                  Gratitude Journal
                </h2>
              </div>

              {/* Clickable Date with Calendar */}
              <div className="flex items-center gap-2">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 hover:bg-amber-200 font-serif"
                      style={{ color: '#451a03' }}
                      data-testid="button-date-picker"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      <span className="font-bold">{dayName}</span>
                      <span className="text-sm" style={{ color: '#78350f' }}>{displayDate}</span>
                      {isToday(currentDate) && (
                        <span className="ml-1 px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: '#166534', color: '#ffffff' }}>
                          Today
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {!isToday(currentDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToToday}
                    className="hover:bg-amber-200 text-xs"
                    style={{ color: '#78350f' }}
                    data-testid="button-goto-today"
                  >
                    Today
                  </Button>
                )}
              </div>
            </div>

            {/* Page Content */}
            <div className="p-4 pb-16">
              {/* Gratitude Prompt */}
              <p className="italic font-serif text-base mb-3" style={{ color: '#78350f' }}>
                What are you grateful for today? Type and press Enter to add.
              </p>

              {/* Input for new checkpoint */}
              <div className="mb-4">
                <Input
                  ref={inputRef}
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="I am grateful for..."
                  className="bg-white/50 border-amber-300 focus:border-amber-500 font-serif"
                  style={{ color: '#1c1917' }}
                  data-testid="input-new-gratitude"
                />
              </div>

              {/* Checkpoints List */}
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#b45309' }} />
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {checkpoints.length === 0 ? (
                    <p className="text-center py-8 font-serif" style={{ color: '#92400e' }}>
                      No gratitude entries yet. Start typing above!
                    </p>
                  ) : (
                    checkpoints.map((checkpoint) => (
                      <div
                        key={checkpoint.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-amber-100/50 group"
                        data-testid={`gratitude-item-${checkpoint.id}`}
                      >
                        <button
                          onClick={() => toggleCheckpoint(checkpoint.id)}
                          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            checkpoint.completed 
                              ? 'bg-green-600 border-green-600' 
                              : 'border-amber-400 hover:border-amber-600'
                          }`}
                          data-testid={`toggle-gratitude-${checkpoint.id}`}
                        >
                          {checkpoint.completed && <Check className="h-3 w-3 text-white" />}
                        </button>
                        <span 
                          className={`flex-1 font-serif ${checkpoint.completed ? 'line-through opacity-60' : ''}`}
                          style={{ color: '#1c1917' }}
                        >
                          {checkpoint.text}
                        </span>
                        <button
                          onClick={() => deleteCheckpoint(checkpoint.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition-opacity"
                          data-testid={`delete-gratitude-${checkpoint.id}`}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Page Navigation */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => flipPage('prev')}
                disabled={isFlipping}
                className="hover:bg-amber-200"
                style={{ color: '#78350f' }}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-6 w-6" />
                <span className="sr-only">Previous Day</span>
              </Button>

              <div className="text-xs font-medium" style={{ color: '#92400e' }}>
                {checkpoints.length} gratitude{checkpoints.length !== 1 ? 's' : ''} recorded
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => flipPage('next')}
                disabled={isFlipping}
                className="hover:bg-amber-200"
                style={{ color: '#78350f' }}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-6 w-6" />
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
