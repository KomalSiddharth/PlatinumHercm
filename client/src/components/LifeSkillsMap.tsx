import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, Map, Plus, ExternalLink, Trophy, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";

interface CourseLesson {
  id: string;
  title: string;
  url: string;
  completed: boolean;
}

interface CourseSubcategory {
  id: string;
  title: string;
  lessons: CourseLesson[];
  subcategories?: CourseSubcategory[];  // Support for nested sub-sub-courses
}

interface CourseTrackingData {
  id: string;
  title: string;
  url: string;
  tags: string[];
  source: string;
  estimatedHours: number;
  status: string;
  progressPercent: number;
  category: string;
  lessons: CourseLesson[];
  subcategories?: CourseSubcategory[];
}

export default function LifeSkillsMap() {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openSubcategories, setOpenSubcategories] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompletedLessons, setShowCompletedLessons] = useState(false);
  const { toast } = useToast();

  console.log('[LifeSkillsMap] Component mounted/rendering');
  
  // Get current user for WebSocket
  const { data: currentUser } = useQuery<{ id: string; email: string }>({
    queryKey: ['/api/auth/user'],
  });
  
  const { data: coursesData, isLoading, isError, error, refetch } = useQuery<CourseTrackingData[]>({
    queryKey: ['/api/courses/tracking'],
    retry: 2,
    retryDelay: 1000,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache at all
    refetchInterval: 30000, // Auto-refresh every 30 seconds as fallback
    refetchIntervalInBackground: true,
  });

  // 🚀 INSTANT GOOGLE SHEETS SYNC - Listen for webhook notifications
  const { lastMessage } = useWebSocket(currentUser?.id);
  
  useEffect(() => {
    if (lastMessage?.type === 'course_data_changed') {
      console.log('[LifeSkillsMap] 📢 Received course data change notification from Google Sheets webhook');
      console.log('[LifeSkillsMap] ⏳ Waiting 10 seconds for Google Sheets API cache to clear...');
      
      toast({
        title: "📢 Courses Syncing...",
        description: "Updating from Google Sheets (10 sec delay for API cache)...",
        duration: 10000,
      });
      
      // Wait 10 seconds for Google Sheets API cache to clear
      setTimeout(async () => {
        console.log('[LifeSkillsMap] 🔄 Force refetching with cache bypass...');
        
        // FORCE fresh fetch - bypass all caches
        await queryClient.resetQueries({ queryKey: ['/api/courses/tracking'] });
        await refetch();
        
        console.log('[LifeSkillsMap] ✅ Fresh data fetched!');
        toast({
          title: "✅ Courses Updated!",
          description: "Google Sheets data synced successfully!",
          duration: 3000,
        });
      }, 10000);
    }
  }, [lastMessage, toast, refetch]);

  // Force refetch on mount to clear any cached errors
  useEffect(() => {
    console.log('[LifeSkillsMap] Forcing refetch on mount');
    queryClient.invalidateQueries({ queryKey: ['/api/courses/tracking'] });
  }, []);

  console.log('[LifeSkillsMap] Query state:', { isLoading, isError, hasData: !!coursesData, error });

  const toggleLessonMutation = useMutation({
    mutationFn: async ({ 
      lessonId, 
      completed, 
      lessonName, 
      courseName, 
      courseId, 
      url, 
      hrcmArea 
    }: { 
      lessonId: string; 
      completed: boolean;
      lessonName?: string;
      courseName?: string;
      courseId?: string;
      url?: string;
      hrcmArea?: string;
    }) => {
      return await apiRequest('/api/lessons/toggle', 'POST', { 
        lessonId, 
        completed, 
        lessonName, 
        courseName, 
        courseId, 
        url, 
        hrcmArea 
      });
    },
    onMutate: async ({ lessonId, completed }) => {
      // Cancel outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['/api/courses/tracking'] });
      await queryClient.cancelQueries({ queryKey: ['/api/user/total-points'] });
      
      // Snapshot the previous values
      const previousCourses = queryClient.getQueryData<CourseTrackingData[]>(['/api/courses/tracking']);
      const previousPoints = queryClient.getQueryData<{ totalPoints: number }>(['/api/user/total-points']);
      
      // Optimistically update the UI
      queryClient.setQueryData<CourseTrackingData[]>(
        ['/api/courses/tracking'],
        (old) => {
          if (!old) return old;
          
          return old.map(course => {
            // Helper function to update lessons recursively
            const updateLessons = (lessons: CourseLesson[]): CourseLesson[] => {
              return lessons.map(lesson => 
                lesson.id === lessonId 
                  ? { ...lesson, completed: completed }
                  : lesson
              );
            };
            
            // Helper function to update subcategories recursively
            const updateSubcategories = (subcats?: CourseSubcategory[]): CourseSubcategory[] | undefined => {
              if (!subcats) return subcats;
              return subcats.map(subcat => ({
                ...subcat,
                lessons: updateLessons(subcat.lessons),
                subcategories: updateSubcategories(subcat.subcategories)
              }));
            };
            
            return {
              ...course,
              lessons: updateLessons(course.lessons),
              subcategories: updateSubcategories(course.subcategories)
            };
          });
        }
      );
      
      // INSTANT POINTS UPDATE: +1 when checking, -1 when unchecking
      if (previousPoints) {
        const pointsChange = completed ? 1 : -1;
        queryClient.setQueryData<{ totalPoints: number }>(
          ['/api/user/total-points'],
          { totalPoints: previousPoints.totalPoints + pointsChange }
        );
        console.log('[Course Tracker] ⚡ Instant points update:', pointsChange > 0 ? '+1' : '-1');
      }
      
      return { previousCourses, previousPoints };
    },
    onSuccess: () => {
      // Refetch to ensure we have the latest data from the server
      queryClient.invalidateQueries({ queryKey: ['/api/courses/tracking'] });
      queryClient.refetchQueries({ queryKey: ['/api/user/total-points'] });
    },
    onError: (error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousCourses) {
        queryClient.setQueryData(['/api/courses/tracking'], context.previousCourses);
      }
      if (context?.previousPoints) {
        queryClient.setQueryData(['/api/user/total-points'], context.previousPoints);
      }
      console.error('[Lesson Toggle] Mutation failed:', error);
    },
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleSubcategory = (subcategoryKey: string) => {
    setOpenSubcategories(prev => ({
      ...prev,
      [subcategoryKey]: !prev[subcategoryKey]
    }));
  };

  // Mutation for adding lesson to persistent assignments
  const addToAssignmentMutation = useMutation({
    mutationFn: async ({
      hrcmArea,
      courseId,
      courseName,
      lessonId,
      lessonName,
      url
    }: {
      hrcmArea: string;
      courseId: string;
      courseName: string;
      lessonId: string;
      lessonName: string;
      url: string;
    }) => {
      return await apiRequest('/api/persistent-assignments', 'POST', {
        hrcmArea,
        courseId,
        courseName,
        lessonId,
        lessonName,
        url,
        completed: false,
        source: 'user'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/persistent-assignments'] });
      toast({
        title: "Added to Assignment",
        description: "Lesson has been added to Next Week Target Assignment column",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add",
        description: error.message || "Failed to add lesson to assignments",
        variant: "destructive",
      });
    },
  });

  const handleAddToAssignment = (
    hrcmArea: string,
    courseId: string,
    courseName: string,
    lessonId: string,
    lessonName: string,
    url: string
  ) => {
    addToAssignmentMutation.mutate({
      hrcmArea,
      courseId,
      courseName,
      lessonId,
      lessonName,
      url
    });
  };

  const handleLessonToggle = (
    courseId: string, 
    lessonId: string, 
    currentCompleted: boolean,
    lessonName?: string,
    courseName?: string,
    url?: string,
    hrcmArea?: string
  ) => {
    toggleLessonMutation.mutate({ 
      lessonId, 
      completed: !currentCompleted,
      lessonName,
      courseName,
      courseId,
      url,
      hrcmArea
    });
  };

  // Calculate overall progress across ALL courses
  const calculateOverallProgress = () => {
    if (!coursesData || coursesData.length === 0) return { completed: 0, total: 0, percent: 0 };
    
    let totalCompleted = 0;
    let totalLessons = 0;
    
    // Helper function to recursively count lessons in subcategories
    const countLessons = (subcats: CourseSubcategory[] | undefined): { total: number, completed: number } => {
      if (!subcats || subcats.length === 0) return { total: 0, completed: 0 };
      
      let total = 0;
      let completed = 0;
      
      subcats.forEach(subcat => {
        total += subcat.lessons.length;
        completed += subcat.lessons.filter(l => l.completed).length;
        
        if (subcat.subcategories && subcat.subcategories.length > 0) {
          const nested = countLessons(subcat.subcategories);
          total += nested.total;
          completed += nested.completed;
        }
      });
      
      return { total, completed };
    };
    
    coursesData.forEach(course => {
      if (course.subcategories && course.subcategories.length > 0) {
        const counts = countLessons(course.subcategories);
        totalLessons += counts.total;
        totalCompleted += counts.completed;
      } else {
        totalLessons += course.lessons.length;
        totalCompleted += course.lessons.filter(l => l.completed).length;
      }
    });
    
    const percent = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;
    return { completed: totalCompleted, total: totalLessons, percent };
  };
  
  const overallProgress = calculateOverallProgress();

  return (
    <>
    <Card 
      className="w-full border-2 border-blue-500/40 bg-[#1a2942] dark:bg-[#1a2942]" 
      data-testid="card-course-tracker"
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white" data-testid="text-course-tracker-title">
              Course Tracker
            </h2>
            <button
              onClick={() => setShowCompletedLessons(true)}
              className="gap-1.5 bg-gradient-to-r from-primary to-accent text-white border-0 text-base px-3 py-1 rounded-full flex items-center cursor-pointer hover:opacity-90 transition-opacity"
              data-testid="badge-course-points"
            >
              <Trophy className="w-4 h-4" />
              {overallProgress.completed} Points
            </button>
          </div>
          <p className="text-sm text-gray-400 mb-3" data-testid="text-course-tracker-subtitle">
            Manage your learning journey and skill development
          </p>
          
          {/* Search Box */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search lessons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-primary"
              data-testid="input-search-lessons"
            />
          </div>
          
          {/* Overall Progress Bar */}
          <div className="space-y-2" data-testid="container-overall-progress">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 font-medium">Overall Progress</span>
            </div>
            <Progress 
              value={overallProgress.percent} 
              className="h-2 bg-gray-700"
              data-testid="progress-overall"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
            data-testid="button-miteshai"
            onClick={() => window.open('https://coaching.miteshkhatri.com/products/mitesh-ai', '_blank')}
          >
            MiteshAI
          </Button>
          <Button
            variant="default"
            size="sm"
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
            data-testid="button-imk-platinum"
            onClick={() => window.open('https://coaching.miteshkhatri.com/products/communities/v2/imk/home', '_blank')}
          >
            IMK - Platinum Community
          </Button>
          <Button
            variant="default"
            size="sm"
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
            data-testid="button-skill-map"
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/13UN1Az5GyUPxj7tKSc26rjvPtNINMkS_C_VoYcuzDHg/edit?usp=sharing', '_blank')}
          >
            Skill Map
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading courses...</p>
            </div>
          </div>
        ) : isError ? (
          <div 
            className="bg-white dark:bg-white rounded-lg border border-gray-300 py-16 px-6"
            data-testid="container-error-state"
          >
            <p className="text-center text-red-600 mb-4" data-testid="text-error-state">
              Error loading courses from Google Sheets
            </p>
            <p className="text-center text-gray-600 text-sm" data-testid="text-error-details">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <div className="flex justify-center mt-4">
              <Button 
                onClick={() => refetch()} 
                variant="outline"
                size="sm"
                className="text-gray-900 border-gray-300"
                data-testid="button-retry"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : !coursesData || coursesData.length === 0 ? (
          <div 
            className="bg-white dark:bg-white rounded-lg border border-gray-300 py-16"
            data-testid="container-empty-state"
          >
            <p className="text-center text-gray-600" data-testid="text-empty-state">
              No courses available at the moment.
            </p>
          </div>
        ) : searchQuery.trim() ? (
          // Search Results View
          <div className="bg-white dark:bg-white rounded-lg border border-gray-300 p-4 max-h-[500px] overflow-y-auto">
            <div className="space-y-2">
              {(() => {
                const searchResults: { course: CourseTrackingData; lesson: CourseLesson; subcategoryTitle?: string }[] = [];
                const query = searchQuery.toLowerCase().trim();
                
                coursesData.forEach(course => {
                  // Search in main lessons
                  course.lessons.forEach(lesson => {
                    if (lesson.title.toLowerCase().includes(query)) {
                      searchResults.push({ course, lesson });
                    }
                  });
                  
                  // Search in subcategory lessons
                  if (course.subcategories) {
                    course.subcategories.forEach(subcat => {
                      subcat.lessons.forEach(lesson => {
                        if (lesson.title.toLowerCase().includes(query)) {
                          searchResults.push({ course, lesson, subcategoryTitle: subcat.title });
                        }
                      });
                    });
                  }
                });
                
                if (searchResults.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      No lessons found for "{searchQuery}"
                    </div>
                  );
                }
                
                return searchResults.map((result, idx) => (
                  <div 
                    key={`${result.course.id}-${result.lesson.id}-${idx}`}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer group border-b border-gray-100 last:border-b-0"
                    onClick={() => handleLessonToggle(result.course.id, result.lesson.id, result.lesson.completed, result.lesson.title, result.course.title, result.lesson.url, result.course.category)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Checkbox
                        checked={result.lesson.completed}
                        onCheckedChange={() => {
                          handleLessonToggle(result.course.id, result.lesson.id, result.lesson.completed, result.lesson.title, result.course.title, result.lesson.url, result.course.category);
                        }}
                        className="border-gray-400"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex flex-col">
                        <a
                          href={result.lesson.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {result.lesson.title}
                        </a>
                        <span className="text-xs text-gray-500">
                          {result.course.title}{result.subcategoryTitle ? ` → ${result.subcategoryTitle}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">1 pt</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-primary/80 hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToAssignment('general', result.course.id, result.course.title, result.lesson.id, result.lesson.title, result.lesson.url);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="mt-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear Search
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-white rounded-lg border border-gray-300 p-4 max-h-[500px] overflow-y-auto">
            <div className="space-y-2">
              {coursesData.map((course, courseIdx) => {
                const totalLessons = course.lessons.length;
                const completedLessons = course.lessons.filter(l => l.completed).length;
                const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                const isOpen = openCategories[course.id] || false;

                return (
                  <Collapsible
                    key={course.id}
                    open={isOpen}
                    onOpenChange={() => toggleCategory(course.id)}
                  >
                    <CollapsibleTrigger 
                      className="flex items-center justify-between w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-100 transition-colors group"
                      data-testid={`button-course-${course.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <ChevronRight 
                          className={`h-4 w-4 text-gray-600 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        />
                        <span className="font-semibold text-gray-900 dark:text-gray-900 text-sm" data-testid={`text-course-title-${course.id}`}>
                          {course.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600" data-testid={`text-course-progress-${course.id}`}>
                            {completedLessons}/{totalLessons} lessons
                          </span>
                          <span className="text-xs font-semibold text-pink-600" data-testid={`text-course-percent-${course.id}`}>
                            {progressPercent}%
                          </span>
                        </div>
                        <div className="w-24">
                          <Progress 
                            value={progressPercent} 
                            className="h-2 bg-gray-200"
                            data-testid={`progress-course-${course.id}`}
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 space-y-1">
                        {course.lessons.map((lesson) => (
                          <div 
                            key={lesson.id}
                            className="flex items-center justify-between p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-50 transition-colors cursor-pointer group"
                            data-testid={`container-lesson-${lesson.id}`}
                            onClick={() => handleLessonToggle(course.id, lesson.id, lesson.completed, lesson.title, course.title, lesson.url, course.category)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Checkbox
                                checked={lesson.completed}
                                onCheckedChange={() => {
                                  handleLessonToggle(course.id, lesson.id, lesson.completed, lesson.title, course.title, lesson.url, course.category);
                                }}
                                className="border-gray-400"
                                data-testid={`checkbox-lesson-${lesson.id}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <a
                                href={lesson.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                data-testid={`link-lesson-${lesson.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {lesson.title}
                              </a>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600" data-testid={`text-lesson-points-${lesson.id}`}>
                                1 pt
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-primary/80 hover:text-primary hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToAssignment('general', course.id, course.title, lesson.id, lesson.title, lesson.url);
                                }}
                                data-testid={`button-add-assignment-${lesson.id}`}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        {/* Render subcategories */}
                        {course.subcategories && course.subcategories.length > 0 && course.subcategories.map((subcat) => {
                          const subcatKey = `${course.id}-${subcat.id}`;
                          const isSubcatOpen = openSubcategories[subcatKey] || false;
                          const totalSubLessons = subcat.lessons.length;
                          const completedSubLessons = subcat.lessons.filter(l => l.completed).length;
                          
                          return (
                            <Collapsible
                              key={subcatKey}
                              open={isSubcatOpen}
                              onOpenChange={() => toggleSubcategory(subcatKey)}
                            >
                              <CollapsibleTrigger 
                                className="flex items-center justify-between w-full p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-100 transition-colors mt-2"
                                data-testid={`button-subcategory-${subcat.id}`}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <ChevronRight 
                                    className={`h-3 w-3 text-gray-600 transition-transform ${isSubcatOpen ? 'rotate-90' : ''}`}
                                  />
                                  <span className="font-medium text-gray-700 dark:text-gray-700 text-xs" data-testid={`text-subcategory-title-${subcat.id}`}>
                                    {subcat.title}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-600" data-testid={`text-subcategory-progress-${subcat.id}`}>
                                  {completedSubLessons}/{totalSubLessons}
                                </span>
                              </CollapsibleTrigger>
                              
                              <CollapsibleContent>
                                <div className="ml-4 mt-1 space-y-1">
                                  {subcat.lessons.map((lesson) => (
                                    <div 
                                      key={lesson.id}
                                      className="flex items-center justify-between p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-50 transition-colors cursor-pointer group"
                                      data-testid={`container-lesson-${lesson.id}`}
                                      onClick={() => handleLessonToggle(course.id, lesson.id, lesson.completed, lesson.title, `${course.title} - ${subcat.title}`, lesson.url, course.category)}
                                    >
                                      <div className="flex items-center gap-2 flex-1">
                                        <Checkbox
                                          checked={lesson.completed}
                                          onCheckedChange={() => {
                                            handleLessonToggle(course.id, lesson.id, lesson.completed, lesson.title, `${course.title} - ${subcat.title}`, lesson.url, course.category);
                                          }}
                                          className="border-gray-400"
                                          data-testid={`checkbox-lesson-${lesson.id}`}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <a
                                          href={lesson.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                          data-testid={`link-lesson-${lesson.id}`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {lesson.title}
                                        </a>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600" data-testid={`text-lesson-points-${lesson.id}`}>
                                          1 pt
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-primary/80 hover:text-primary hover:bg-primary/10"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddToAssignment('general', course.id, `${course.title} - ${subcat.title}`, lesson.id, lesson.title, lesson.url);
                                          }}
                                          data-testid={`button-add-assignment-${lesson.id}`}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Completed Lessons Dialog */}
    <Dialog open={showCompletedLessons} onOpenChange={setShowCompletedLessons}> 
      <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Completed Lessons
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {(() => {
            const completedLessons: { course: string; lesson: string; url: string }[] = [];
            
            if (coursesData) {
              coursesData.forEach(course => {
                // Get completed lessons from main lessons
                course.lessons.forEach(lesson => {
                  if (lesson.completed) {
                    completedLessons.push({
                      course: course.title,
                      lesson: lesson.title,
                      url: lesson.url
                    });
                  }
                });
                
                // Get completed lessons from subcategories
                if (course.subcategories) {
                  course.subcategories.forEach(subcat => {
                    subcat.lessons.forEach(lesson => {
                      if (lesson.completed) {
                        completedLessons.push({
                          course: `${course.title} → ${subcat.title}`,
                          lesson: lesson.title,
                          url: lesson.url
                        });
                      }
                    });
                  });
                }
              });
            }
            
            if (completedLessons.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  No completed lessons yet. Start learning!
                </div>
              );
            }
            
            return completedLessons.map((item, idx) => (
              <div 
                key={idx}
                className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1">
                  <a 
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {item.lesson}
                  </a>
                  <p className="text-xs text-gray-500 mt-1">{item.course}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                    +1 pt
                  </span>
                </div>
              </div>
            ));
          })()}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
