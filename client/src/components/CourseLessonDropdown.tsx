import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, BookOpen, CheckCircle2, Circle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Lesson {
  id: string;
  title: string;
  link: string;
  duration: string;
  difficulty: string;
  courseName: string;
}

interface CourseLessonDropdownProps {
  courseName: string;
  category: 'Health' | 'Relationship' | 'Career' | 'Money';
  onProgressChange?: (completed: number, total: number) => void;
}

export default function CourseLessonDropdown({ 
  courseName, 
  category,
  onProgressChange 
}: CourseLessonDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Fetch lessons for the course
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ['/api/lessons', courseName],
    enabled: isOpen, // Only fetch when dropdown is opened
  });

  // Fetch completed lesson titles
  const { data: completedLessons = [], isLoading: completionsLoading } = useQuery<string[]>({
    queryKey: ['/api/lessons', courseName, 'completions'],
    enabled: isOpen, // Only fetch when dropdown is opened
  });

  // Toggle lesson completion mutation
  const toggleLessonMutation = useMutation({
    mutationFn: async (lessonTitle: string) => {
      return apiRequest('POST', `/api/lessons/${encodeURIComponent(courseName)}/toggle`, {
        lessonTitle
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lessons', courseName, 'completions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hercm/weeks'] }); // Refresh progress
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update lesson',
        variant: 'destructive'
      });
    }
  });

  // Update progress when completions change
  useEffect(() => {
    if (lessons.length > 0 && onProgressChange) {
      const completed = completedLessons.length;
      const total = lessons.length;
      onProgressChange(completed, total);
    }
  }, [completedLessons, lessons, onProgressChange]);

  const isLessonCompleted = (lessonTitle: string) => {
    return completedLessons.includes(lessonTitle);
  };

  const completionPercentage = lessons.length > 0 
    ? Math.round((completedLessons.length / lessons.length) * 100)
    : 0;

  // Get color based on category
  const getCategoryColors = () => {
    switch (category) {
      case 'Health':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/20',
          hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
          text: 'text-emerald-700 dark:text-emerald-400',
          border: 'border-emerald-200 dark:border-emerald-800',
          progress: 'bg-emerald-500'
        };
      case 'Relationship':
        return {
          bg: 'bg-pink-50 dark:bg-pink-950/20',
          hover: 'hover:bg-pink-100 dark:hover:bg-pink-900/30',
          text: 'text-pink-700 dark:text-pink-400',
          border: 'border-pink-200 dark:border-pink-800',
          progress: 'bg-pink-500'
        };
      case 'Career':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-400',
          border: 'border-blue-200 dark:border-blue-800',
          progress: 'bg-blue-500'
        };
      case 'Money':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30',
          text: 'text-amber-700 dark:text-amber-400',
          border: 'border-amber-200 dark:border-amber-800',
          progress: 'bg-amber-500'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-950/20',
          hover: 'hover:bg-gray-100 dark:hover:bg-gray-900/30',
          text: 'text-gray-700 dark:text-gray-400',
          border: 'border-gray-200 dark:border-gray-800',
          progress: 'bg-gray-500'
        };
    }
  };

  const colors = getCategoryColors();

  return (
    <div className="space-y-1">
      {/* Dropdown Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-2 rounded-md transition-colors ${colors.bg} ${colors.hover} ${colors.border} border`}
        data-testid={`button-lessons-dropdown-${category.toLowerCase()}`}
      >
        <div className="flex items-center gap-2">
          <BookOpen className={`w-4 h-4 ${colors.text}`} />
          <span className={`text-xs font-medium ${colors.text}`}>
            {courseName.split(' - ')[0]} Lessons
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${colors.text}`}>
            {completedLessons.length}/{lessons.length || '?'}
          </span>
          {isOpen ? (
            <ChevronUp className={`w-4 h-4 ${colors.text}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${colors.text}`} />
          )}
        </div>
      </button>

      {/* Lesson List */}
      {isOpen && (
        <div className={`border ${colors.border} rounded-md overflow-hidden`}>
          {lessonsLoading || completionsLoading ? (
            <div className="p-3 text-xs text-muted-foreground text-center">
              Loading lessons...
            </div>
          ) : lessons.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center">
              No lessons available
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {lessons.map((lesson, index) => {
                const completed = isLessonCompleted(lesson.title);
                return (
                  <div
                    key={lesson.id}
                    className={`flex items-start gap-2 p-2 ${index > 0 ? 'border-t' : ''} ${colors.border} ${colors.hover} transition-colors`}
                    data-testid={`lesson-item-${index}`}
                  >
                    <Checkbox
                      checked={completed}
                      onCheckedChange={() => toggleLessonMutation.mutate(lesson.title)}
                      className="mt-0.5"
                      data-testid={`checkbox-lesson-${index}`}
                    />
                    <div className="flex-1 min-w-0">
                      <a
                        href={lesson.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs font-medium ${completed ? 'line-through text-muted-foreground' : colors.text} hover:underline`}
                        data-testid={`link-lesson-${index}`}
                      >
                        {lesson.title.split(' - ').slice(1).join(' - ') || lesson.title}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        <span>{lesson.duration}</span>
                        <span>•</span>
                        <span>{lesson.difficulty}</span>
                      </div>
                    </div>
                    {completed && (
                      <CheckCircle2 className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
