import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, Map } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

  console.log('[LifeSkillsMap] Component mounted/rendering');
  
  const { data: coursesData, isLoading, isError, error, refetch } = useQuery<CourseTrackingData[]>({
    queryKey: ['/api/courses/tracking'],
    retry: 2,
    retryDelay: 1000,
  });

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
      
      // Snapshot the previous value
      const previousCourses = queryClient.getQueryData<CourseTrackingData[]>(['/api/courses/tracking']);
      
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
                  ? { ...lesson, completed: !completed }
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
      
      return { previousCourses };
    },
    onSuccess: () => {
      // Refetch to ensure we have the latest data from the server
      queryClient.invalidateQueries({ queryKey: ['/api/courses/tracking'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/total-points'] });
      queryClient.refetchQueries({ queryKey: ['/api/user/total-points'] });
    },
    onError: (error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousCourses) {
        queryClient.setQueryData(['/api/courses/tracking'], context.previousCourses);
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
    <Card 
      className="w-full border-2 border-blue-500/40 bg-[#1a2942] dark:bg-[#1a2942]" 
      data-testid="card-course-tracker"
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-1" data-testid="text-course-tracker-title">
            Course Tracker
          </h2>
          <p className="text-sm text-gray-400 mb-3" data-testid="text-course-tracker-subtitle">
            Manage your learning journey and skill development
          </p>
          
          {/* Overall Progress Bar */}
          <div className="space-y-2" data-testid="container-overall-progress">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 font-medium">Overall Progress</span>
              <span className="text-primary font-bold" data-testid="text-overall-progress-percent">
                {overallProgress.completed}/{overallProgress.total} lessons ({overallProgress.percent}%)
              </span>
            </div>
            <Progress 
              value={overallProgress.percent} 
              className="h-2 bg-gray-700"
              data-testid="progress-overall"
            />
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white flex items-center gap-1"
          data-testid="button-skill-map"
          onClick={() => window.open('https://docs.google.com/spreadsheets/d/13UN1Az5GyUPxj7tKSc26rjvPtNINMkS_C_VoYcuzDHg/edit?usp=sharing', '_blank')}
        >
          <Map className="h-4 w-4" />
          Skill Map
        </Button>
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
            className="bg-[#0f1c2e] dark:bg-[#0f1c2e] rounded-lg border border-blue-700/50 py-16 px-6"
            data-testid="container-error-state"
          >
            <p className="text-center text-red-400 mb-4" data-testid="text-error-state">
              Error loading courses from Google Sheets
            </p>
            <p className="text-center text-gray-500 text-sm" data-testid="text-error-details">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <div className="flex justify-center mt-4">
              <Button 
                onClick={() => refetch()} 
                variant="outline"
                size="sm"
                className="text-white border-white/20 hover:bg-white/10"
                data-testid="button-retry"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : !coursesData || coursesData.length === 0 ? (
          <div 
            className="bg-[#0f1c2e] dark:bg-[#0f1c2e] rounded-lg border border-gray-700/50 py-16"
            data-testid="container-empty-state"
          >
            <p className="text-center text-gray-400" data-testid="text-empty-state">
              No courses available at the moment.
            </p>
          </div>
        ) : (
          <div className="bg-[#0f1c2e] dark:bg-[#0f1c2e] rounded-lg border border-gray-700/50 p-6">
            <div className="space-y-3">
              {coursesData.map((course, courseIdx) => {
                let totalLessons = 0;
                let completedLessons = 0;
                
                // Helper function to recursively count lessons in subcategories
                const countLessons = (subcats: CourseSubcategory[] | undefined): { total: number, completed: number } => {
                  if (!subcats || subcats.length === 0) return { total: 0, completed: 0 };
                  
                  let total = 0;
                  let completed = 0;
                  
                  subcats.forEach(subcat => {
                    // Count direct lessons
                    total += subcat.lessons.length;
                    completed += subcat.lessons.filter(l => l.completed).length;
                    
                    // Recursively count lessons in nested subcategories
                    if (subcat.subcategories && subcat.subcategories.length > 0) {
                      const nested = countLessons(subcat.subcategories);
                      total += nested.total;
                      completed += nested.completed;
                    }
                  });
                  
                  return { total, completed };
                };
                
                if (course.subcategories && course.subcategories.length > 0) {
                  const counts = countLessons(course.subcategories);
                  totalLessons = counts.total;
                  completedLessons = counts.completed;
                } else {
                  totalLessons = course.lessons.length;
                  completedLessons = course.lessons.filter(l => l.completed).length;
                }
                
                const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                const isOpen = openCategories[course.id] || false;

                return (
                  <Collapsible
                    key={course.id}
                    open={isOpen}
                    onOpenChange={() => toggleCategory(course.id)}
                  >
                    <CollapsibleTrigger 
                      className="flex items-center justify-between w-full p-3 rounded-md hover:bg-gray-800/50 transition-colors group"
                      data-testid={`button-course-${course.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <ChevronRight 
                          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        />
                        <span className="font-semibold text-white text-sm" data-testid={`text-course-title-${course.id}`}>
                          {course.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400" data-testid={`text-course-progress-${course.id}`}>
                            {completedLessons}/{totalLessons} lessons
                          </span>
                          <span className="text-xs font-semibold text-pink-400" data-testid={`text-course-percent-${course.id}`}>
                            {progressPercent}%
                          </span>
                        </div>
                        <div className="w-24">
                          <Progress 
                            value={progressPercent} 
                            className="h-2 bg-gray-700"
                            data-testid={`progress-course-${course.id}`}
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="ml-6 mt-2 space-y-2">
                        {/* Show main course lessons first (if any) */}
                        {course.lessons && course.lessons.length > 0 && (
                          <div className="ml-5 space-y-1 mb-3">
                            {course.lessons.map((lesson) => (
                              <div 
                                key={lesson.id}
                                className="flex items-center justify-between p-2 rounded hover:bg-gray-800/20 transition-colors cursor-pointer"
                                data-testid={`container-lesson-${lesson.id}`}
                                onClick={() => handleLessonToggle(course.id, lesson.id, lesson.completed, lesson.title, course.title, lesson.url, course.category)}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <Checkbox
                                    checked={lesson.completed}
                                    onCheckedChange={(checked) => {
                                      // Prevent double-toggle from parent onClick
                                      return;
                                    }}
                                    className="border-gray-500 pointer-events-none"
                                    data-testid={`checkbox-lesson-${lesson.id}`}
                                  />
                                  <a
                                    href={lesson.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                                    data-testid={`link-lesson-${lesson.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {lesson.title}
                                  </a>
                                </div>
                                <span className="text-xs text-gray-500" data-testid={`text-lesson-points-${lesson.id}`}>
                                  10 pts
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Show subcategories (if any) */}
                        {course.subcategories && course.subcategories.length > 0 && course.subcategories.map((subcat) => {
                            const subcatKey = `${course.id}-${subcat.id}`;
                            const isSubcatOpen = openSubcategories[subcatKey] || false;
                            
                            return (
                              <Collapsible
                                key={subcatKey}
                                open={isSubcatOpen}
                                onOpenChange={() => toggleSubcategory(subcatKey)}
                              >
                                <div className="border border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-blue-900/10 rounded-md mb-2">
                                  <CollapsibleTrigger 
                                    className="flex items-center justify-between w-full p-3 rounded-md hover:bg-cyan-900/30 transition-colors"
                                    data-testid={`button-subcategory-${subcatKey}`}
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <ChevronRight 
                                        className={`h-4 w-4 text-cyan-400 transition-transform ${isSubcatOpen ? 'rotate-90' : ''}`}
                                      />
                                      <span className="text-sm font-semibold text-cyan-300" data-testid={`text-subcategory-title-${subcatKey}`}>
                                        🔸 {subcat.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-cyan-400/60" data-testid={`text-subcat-progress-${subcatKey}`}>
                                          {subcat.lessons.filter(l => l.completed).length}/{subcat.lessons.length} lessons
                                        </span>
                                        <span className="text-xs font-semibold text-cyan-300" data-testid={`text-subcat-percent-${subcatKey}`}>
                                          {subcat.lessons.length > 0 ? Math.round((subcat.lessons.filter(l => l.completed).length / subcat.lessons.length) * 100) : 0}%
                                        </span>
                                      </div>
                                      <div className="w-20">
                                        <Progress 
                                          value={subcat.lessons.length > 0 ? Math.round((subcat.lessons.filter(l => l.completed).length / subcat.lessons.length) * 100) : 0} 
                                          className="h-2 bg-cyan-950"
                                          data-testid={`progress-subcat-${subcatKey}`}
                                        />
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  
                                  <CollapsibleContent>
                                    <div className="ml-5 mt-2 space-y-1 bg-cyan-950/10 p-2 rounded-b-md">
                                      {subcat.lessons.map((lesson) => (
                                        <div 
                                          key={lesson.id}
                                          className="flex items-center justify-between p-2 rounded hover:bg-gray-800/20 transition-colors cursor-pointer"
                                          data-testid={`container-lesson-${lesson.id}`}
                                          onClick={() => handleLessonToggle(course.id, lesson.id, lesson.completed, lesson.title, subcat.title, lesson.url, course.category)}
                                        >
                                          <div className="flex items-center gap-2 flex-1">
                                            <Checkbox
                                              checked={lesson.completed}
                                              onCheckedChange={(checked) => {
                                                // Prevent double-toggle from parent onClick
                                                return;
                                              }}
                                              className="border-gray-500 pointer-events-none"
                                              data-testid={`checkbox-lesson-${lesson.id}`}
                                            />
                                            <a
                                              href={lesson.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                                              data-testid={`link-lesson-${lesson.id}`}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {lesson.title}
                                            </a>
                                          </div>
                                          <span className="text-xs text-gray-500" data-testid={`text-lesson-points-${lesson.id}`}>
                                            10 pts
                                          </span>
                                        </div>
                                      ))}
                                      
                                      {/* Show sub-sub-courses (nested subcategories) with purple/violet gradient */}
                                      {subcat.subcategories && subcat.subcategories.length > 0 && subcat.subcategories.map((subSubcat) => {
                                        const subSubcatKey = `${course.id}-${subcat.id}-${subSubcat.id}`;
                                        const isSubSubcatOpen = openSubcategories[subSubcatKey] || false;
                                        
                                        return (
                                          <Collapsible
                                            key={subSubcatKey}
                                            open={isSubSubcatOpen}
                                            onOpenChange={() => toggleSubcategory(subSubcatKey)}
                                          >
                                            <div className="border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-violet-900/10 rounded-md mb-2 mt-2">
                                              <CollapsibleTrigger 
                                                className="flex items-center justify-between w-full p-3 rounded-md hover:bg-purple-900/30 transition-colors"
                                                data-testid={`button-subsubcategory-${subSubcatKey}`}
                                              >
                                                <div className="flex items-center gap-2 flex-1">
                                                  <ChevronRight 
                                                    className={`h-3.5 w-3.5 text-purple-400 transition-transform ${isSubSubcatOpen ? 'rotate-90' : ''}`}
                                                  />
                                                  <span className="text-sm font-semibold text-purple-300" data-testid={`text-subsubcategory-title-${subSubcatKey}`}>
                                                    🔹 {subSubcat.title}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs text-purple-400/60" data-testid={`text-subsubcat-progress-${subSubcatKey}`}>
                                                      {subSubcat.lessons.filter(l => l.completed).length}/{subSubcat.lessons.length} lessons
                                                    </span>
                                                    <span className="text-xs font-semibold text-purple-300" data-testid={`text-subsubcat-percent-${subSubcatKey}`}>
                                                      {subSubcat.lessons.length > 0 ? Math.round((subSubcat.lessons.filter(l => l.completed).length / subSubcat.lessons.length) * 100) : 0}%
                                                    </span>
                                                  </div>
                                                  <div className="w-20">
                                                    <Progress 
                                                      value={subSubcat.lessons.length > 0 ? Math.round((subSubcat.lessons.filter(l => l.completed).length / subSubcat.lessons.length) * 100) : 0} 
                                                      className="h-2 bg-purple-950"
                                                      data-testid={`progress-subsubcat-${subSubcatKey}`}
                                                    />
                                                  </div>
                                                </div>
                                              </CollapsibleTrigger>
                                              
                                              <CollapsibleContent>
                                                <div className="ml-5 mt-2 space-y-1 bg-purple-950/10 p-2 rounded-b-md">
                                                  {subSubcat.lessons.map((lesson) => (
                                                    <div 
                                                      key={lesson.id}
                                                      className="flex items-center justify-between p-2 rounded hover:bg-gray-800/20 transition-colors cursor-pointer"
                                                      data-testid={`container-lesson-${lesson.id}`}
                                                      onClick={() => handleLessonToggle(course.id, lesson.id, lesson.completed, lesson.title, subSubcat.title, lesson.url, course.category)}
                                                    >
                                                      <div className="flex items-center gap-2 flex-1">
                                                        <Checkbox
                                                          checked={lesson.completed}
                                                          onCheckedChange={(checked) => {
                                                            // Prevent double-toggle from parent onClick
                                                            return;
                                                          }}
                                                          className="border-gray-500 pointer-events-none"
                                                          data-testid={`checkbox-lesson-${lesson.id}`}
                                                        />
                                                        <a
                                                          href={lesson.url}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                                                          data-testid={`link-lesson-${lesson.id}`}
                                                          onClick={(e) => e.stopPropagation()}
                                                        >
                                                          {lesson.title}
                                                        </a>
                                                      </div>
                                                      <span className="text-xs text-gray-500" data-testid={`text-lesson-points-${lesson.id}`}>
                                                        10 pts
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </CollapsibleContent>
                                            </div>
                                          </Collapsible>
                                        );
                                      })}
                                    </div>
                                  </CollapsibleContent>
                                </div>
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
  );
}
