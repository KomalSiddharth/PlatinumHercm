import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, BookOpen, Loader2, CalendarIcon, X } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import cosmicBackground from '@assets/download_1764151077805.jpg';

interface GratitudeJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GratitudeItem {
  id: string;
  text: string;
}

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl"
      >
        {/* Book Container with Cosmic Background */}
        <div className="relative perspective-1000">
          {/* Glowing Spine Effect */}
          <div className="absolute -left-2 top-0 bottom-0 w-6 bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-700 rounded-l-md shadow-xl z-10" />
          
          {/* Main Book */}
          <div 
            className={`
              relative min-h-[450px] 
              transition-transform duration-300 ease-in-out
              ${isFlipping ? (flipDirection === 'left' ? 'animate-flip-left' : 'animate-flip-right') : ''}
            `}
            style={{
              backgroundImage: `url(${cosmicBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Semi-transparent overlay for better readability */}
            <div className="absolute inset-0 bg-black/30" />
            
            {/* Content wrapper */}
            <div className="relative z-10">
              {/* Compact Header with Date Picker */}
              <div className="flex items-center justify-between p-3 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-pink-300" />
                  <h2 className="text-lg font-serif font-bold text-white drop-shadow-lg">
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
                        className="flex items-center gap-2 font-serif hover:bg-white/10 text-white"
                        data-testid="button-date-picker"
                      >
                        <CalendarIcon className="h-4 w-4 text-pink-300" />
                        <span className="font-bold">{dayName}</span>
                        <span className="text-sm text-pink-200">{displayDate}</span>
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

                </div>
              </div>

              {/* Page Content */}
              <div className="p-4 pb-16">
                {/* Gratitude Prompt */}
                <p className="italic font-serif text-base mb-3 text-pink-200 drop-shadow">
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
                    className="bg-white/20 backdrop-blur-sm font-serif text-white placeholder:text-white/50 border-white/30 focus:border-pink-400"
                    data-testid="input-new-gratitude"
                  />
                </div>

                {/* Items List - Scrollable after 10 items */}
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
                  </div>
                ) : (
                  <div className={`space-y-1 pr-2 ${items.length > 10 ? 'max-h-[320px] overflow-y-auto' : ''}`}>
                    {items.length === 0 ? (
                      <p className="text-center py-8 font-serif text-pink-200/80">
                        No gratitude entries yet. Start typing above!
                      </p>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 py-1 group"
                          data-testid={`gratitude-item-${item.id}`}
                        >
                          {/* Bullet Point - Glowing Pink */}
                          <span className="flex-shrink-0 mt-1.5 ml-2 w-2 h-2 rounded-full bg-pink-400 shadow-sm shadow-pink-400/50" />
                          
                          {/* Text or Edit Input */}
                          {editingId === item.id ? (
                            <Input
                              ref={editInputRef}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={saveEdit}
                              className="flex-1 bg-white/90 font-serif py-0 h-7 text-gray-900 border-pink-400"
                              data-testid={`edit-gratitude-${item.id}`}
                            />
                          ) : (
                            <span 
                              onClick={() => startEditing(item)}
                              className="flex-1 font-serif cursor-pointer hover:text-pink-300 text-white drop-shadow rounded px-1 -mx-1 transition-colors"
                              data-testid={`text-gratitude-${item.id}`}
                            >
                              {item.text}
                            </span>
                          )}
                          
                          {/* Delete button */}
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/30 transition-opacity flex-shrink-0"
                            data-testid={`delete-gratitude-${item.id}`}
                          >
                            <X className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Page Navigation */}
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-4 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => flipPage('prev')}
                  disabled={isFlipping}
                  className="hover:bg-white/10 text-white"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-6 w-6" />
                  <span className="sr-only">Previous Day</span>
                </Button>

                <div className="text-xs font-medium text-pink-200">
                  {items.length} gratitude{items.length !== 1 ? 's' : ''} recorded
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => flipPage('next')}
                  disabled={isFlipping}
                  className="hover:bg-white/10 text-white"
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-6 w-6" />
                  <span className="sr-only">Next Day</span>
                </Button>
              </div>
            </div>

            {/* Page Edge Effect - Glowing Purple */}
            <div className="absolute right-0 top-4 bottom-4 w-1 bg-purple-500/50" />
            <div className="absolute right-1 top-4 bottom-4 w-px bg-pink-500/30" />
            <div className="absolute right-2 top-4 bottom-4 w-px bg-indigo-500/20" />
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
