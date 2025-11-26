import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, BookOpen, Loader2, CalendarIcon, X } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface GratitudeJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GratitudeItem {
  id: string;
  text: string;
}

// Day-based themes for the journal
const dayThemes = {
  0: { // Sunday - Calm Cream
    name: 'Sunday Serenity',
    background: '#fef3c7',
    spine: 'from-amber-800 via-amber-700 to-amber-600',
    border: '#92400e',
    title: '#451a03',
    text: '#78350f',
    bullet: '#b45309',
    lineColor: 'rgba(139, 69, 19, 0.12)',
    edgeGradient: 'rgba(139, 69, 19, 0.15)',
  },
  1: { // Monday - Fresh Green
    name: 'Monday Fresh',
    background: '#dcfce7',
    spine: 'from-green-800 via-green-700 to-green-600',
    border: '#166534',
    title: '#14532d',
    text: '#15803d',
    bullet: '#22c55e',
    lineColor: 'rgba(22, 101, 52, 0.12)',
    edgeGradient: 'rgba(22, 101, 52, 0.15)',
  },
  2: { // Tuesday - Sky Blue
    name: 'Tuesday Calm',
    background: '#e0f2fe',
    spine: 'from-sky-800 via-sky-700 to-sky-600',
    border: '#0369a1',
    title: '#0c4a6e',
    text: '#0284c7',
    bullet: '#0ea5e9',
    lineColor: 'rgba(3, 105, 161, 0.12)',
    edgeGradient: 'rgba(3, 105, 161, 0.15)',
  },
  3: { // Wednesday - Lavender Purple
    name: 'Wednesday Wisdom',
    background: '#f3e8ff',
    spine: 'from-purple-800 via-purple-700 to-purple-600',
    border: '#7e22ce',
    title: '#581c87',
    text: '#9333ea',
    bullet: '#a855f7',
    lineColor: 'rgba(126, 34, 206, 0.12)',
    edgeGradient: 'rgba(126, 34, 206, 0.15)',
  },
  4: { // Thursday - Warm Orange
    name: 'Thursday Warmth',
    background: '#ffedd5',
    spine: 'from-orange-800 via-orange-700 to-orange-600',
    border: '#c2410c',
    title: '#7c2d12',
    text: '#ea580c',
    bullet: '#f97316',
    lineColor: 'rgba(194, 65, 12, 0.12)',
    edgeGradient: 'rgba(194, 65, 12, 0.15)',
  },
  5: { // Friday - Coral Pink
    name: 'Friday Joy',
    background: '#fce7f3',
    spine: 'from-pink-800 via-pink-700 to-pink-600',
    border: '#be185d',
    title: '#831843',
    text: '#db2777',
    bullet: '#ec4899',
    lineColor: 'rgba(190, 24, 93, 0.12)',
    edgeGradient: 'rgba(190, 24, 93, 0.15)',
  },
  6: { // Saturday - Golden Yellow
    name: 'Saturday Sunshine',
    background: '#fef9c3',
    spine: 'from-yellow-700 via-yellow-600 to-yellow-500',
    border: '#a16207',
    title: '#713f12',
    text: '#ca8a04',
    bullet: '#eab308',
    lineColor: 'rgba(161, 98, 7, 0.12)',
    edgeGradient: 'rgba(161, 98, 7, 0.15)',
  },
};

export function GratitudeJournalDialog({ open, onOpenChange }: GratitudeJournalDialogProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<GratitudeItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'left' | 'right' | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayName = format(currentDate, 'EEEE');
  const displayDate = format(currentDate, 'MMM d, yyyy');
  
  // Get theme based on day of week
  const dayOfWeek = currentDate.getDay() as keyof typeof dayThemes;
  const theme = dayThemes[dayOfWeek];

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

  // Parse items from stored text (JSON format)
  const parseItems = (text: string): GratitudeItem[] => {
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        // Handle both old format (with completed) and new format
        return parsed.map((item: any) => ({ id: item.id, text: item.text }));
      }
    } catch {
      // Legacy format: plain text, convert to single item
      if (text.trim()) {
        return [{ id: Date.now().toString(), text: text.trim() }];
      }
    }
    return [];
  };

  // Convert items to stored format
  const serializeItems = (itemList: GratitudeItem[]): string => {
    return JSON.stringify(itemList);
  };

  // Update items when entry loads
  useEffect(() => {
    if (entry?.gratitudeText !== undefined) {
      setItems(parseItems(entry.gratitudeText || ''));
    } else {
      setItems([]);
    }
  }, [entry]);

  // Auto-save items
  const saveItems = useCallback((itemList: GratitudeItem[]) => {
    const serialized = serializeItems(itemList);
    saveMutation.mutate({ date: dateStr, gratitudeText: serialized });
  }, [dateStr, saveMutation]);

  // Add new item on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newItemText.trim()) {
      e.preventDefault();
      const newItem: GratitudeItem = {
        id: Date.now().toString(),
        text: newItemText.trim(),
      };
      const updated = [...items, newItem];
      setItems(updated);
      setNewItemText('');
      saveItems(updated);
      
      // Keep focus on input
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  // Start editing an item
  const startEditing = (item: GratitudeItem) => {
    setEditingId(item.id);
    setEditingText(item.text);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  // Save edited item
  const saveEdit = () => {
    if (editingId && editingText.trim()) {
      const updated = items.map(item =>
        item.id === editingId ? { ...item, text: editingText.trim() } : item
      );
      setItems(updated);
      saveItems(updated);
    }
    setEditingId(null);
    setEditingText('');
  };

  // Handle edit keydown
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingText('');
    }
  };

  // Delete item
  const deleteItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    saveItems(updated);
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
      <DialogContent 
        className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl"
        style={{ backgroundColor: theme.background }}
      >
        {/* Book Container */}
        <div className="relative perspective-1000">
          {/* Book Cover / Spine Effect */}
          <div className={`absolute -left-2 top-0 bottom-0 w-6 bg-gradient-to-r ${theme.spine} rounded-l-md shadow-xl z-10`} />
          
          {/* Main Book */}
          <div 
            className={`
              relative min-h-[450px] 
              transition-transform duration-300 ease-in-out
              ${isFlipping ? (flipDirection === 'left' ? 'animate-flip-left' : 'animate-flip-right') : ''}
            `}
            style={{
              backgroundColor: theme.background,
              backgroundImage: `
                linear-gradient(to right, ${theme.edgeGradient} 0%, transparent 8%),
                repeating-linear-gradient(
                  to bottom,
                  transparent,
                  transparent 31px,
                  ${theme.lineColor} 31px,
                  ${theme.lineColor} 32px
                )
              `,
            }}
          >
            {/* Compact Header with Date Picker */}
            <div className="flex items-center justify-between p-3 border-b-2" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" style={{ color: theme.text }} />
                <h2 className="text-lg font-serif font-bold" style={{ color: theme.title }}>
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
                      className="flex items-center gap-2 font-serif hover:opacity-80"
                      style={{ color: theme.title }}
                      data-testid="button-date-picker"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      <span className="font-bold">{dayName}</span>
                      <span className="text-sm" style={{ color: theme.text }}>{displayDate}</span>
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
                    className="text-xs hover:opacity-80"
                    style={{ color: theme.text }}
                    data-testid="button-goto-today"
                  >
                    Today
                  </Button>
                )}
              </div>
            </div>

            {/* Theme Name Badge */}
            <div className="px-4 pt-2">
              <span 
                className="inline-block px-2 py-0.5 text-xs rounded-full font-medium"
                style={{ backgroundColor: theme.bullet, color: '#ffffff' }}
              >
                {theme.name}
              </span>
            </div>

            {/* Page Content */}
            <div className="p-4 pb-16">
              {/* Gratitude Prompt */}
              <p className="italic font-serif text-base mb-3" style={{ color: theme.text }}>
                What are you grateful for today? Type and press Enter to add.
              </p>

              {/* Input for new item */}
              <div className="mb-4">
                <Input
                  ref={inputRef}
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="I am grateful for..."
                  className="bg-white/50 font-serif"
                  style={{ color: '#1c1917', borderColor: theme.border }}
                  data-testid="input-new-gratitude"
                />
              </div>

              {/* Items List */}
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.bullet }} />
                </div>
              ) : (
                <div className="space-y-1 max-h-[250px] overflow-y-auto pr-2">
                  {items.length === 0 ? (
                    <p className="text-center py-8 font-serif" style={{ color: theme.text }}>
                      No gratitude entries yet. Start typing above!
                    </p>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 py-1 group"
                        data-testid={`gratitude-item-${item.id}`}
                      >
                        {/* Bullet Point */}
                        <span className="flex-shrink-0 mt-1.5 ml-2 w-2 h-2 rounded-full" style={{ backgroundColor: theme.bullet }} />
                        
                        {/* Text or Edit Input */}
                        {editingId === item.id ? (
                          <Input
                            ref={editInputRef}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={saveEdit}
                            className="flex-1 bg-white/80 font-serif py-0 h-7"
                            style={{ color: '#1c1917', borderColor: theme.border }}
                            data-testid={`edit-gratitude-${item.id}`}
                          />
                        ) : (
                          <span 
                            onClick={() => startEditing(item)}
                            className="flex-1 font-serif cursor-pointer hover:opacity-70 rounded px-1 -mx-1"
                            style={{ color: '#1c1917' }}
                            data-testid={`text-gratitude-${item.id}`}
                          >
                            {item.text}
                          </span>
                        )}
                        
                        {/* Delete button */}
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition-opacity flex-shrink-0"
                          data-testid={`delete-gratitude-${item.id}`}
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
                className="hover:opacity-80"
                style={{ color: theme.text }}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-6 w-6" />
                <span className="sr-only">Previous Day</span>
              </Button>

              <div className="text-xs font-medium" style={{ color: theme.border }}>
                {items.length} gratitude{items.length !== 1 ? 's' : ''} recorded
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => flipPage('next')}
                disabled={isFlipping}
                className="hover:opacity-80"
                style={{ color: theme.text }}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-6 w-6" />
                <span className="sr-only">Next Day</span>
              </Button>
            </div>

            {/* Page Edge Effect - Theme colors */}
            <div className="absolute right-0 top-4 bottom-4 w-1" style={{ backgroundColor: theme.bullet }} />
            <div className="absolute right-1 top-4 bottom-4 w-px" style={{ backgroundColor: theme.border }} />
            <div className="absolute right-2 top-4 bottom-4 w-px" style={{ backgroundColor: theme.text }} />
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
