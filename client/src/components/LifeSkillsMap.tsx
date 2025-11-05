import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, Map } from "lucide-react";
import { useState } from "react";
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
  
  const { data: coursesData, isLoading, isError, error } = useQuery<CourseTrackingData[]>({
    queryKey: ['/api/courses/tracking'],
  });

  console.log('[LifeSkillsMap] Query state:', { isLoading, isError, hasData: !!coursesData, error });

  const toggleLessonMutation = useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      return await apiRequest('/api/lessons/toggle', 'POST', { lessonId, completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses/tracking'] });
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

  const handleLessonToggle = (lessonId: string, currentCompleted: boolean) => {
    toggleLessonMutation.mutate({ lessonId, completed: !currentCompleted });
  };

  return (
    <Card 
      className="w-full border-2 border-primary/40 bg-[#1a2942] dark:bg-[#1a2942]" 
      data-testid="card-course-tracker"
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-1" data-testid="text-course-tracker-title">
            Course Tracker
          </h2>
          <p className="text-sm text-gray-400" data-testid="text-course-tracker-subtitle">
            Manage your learning journey and skill development
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="bg-[#ec4899] hover:bg-[#db2777] text-white flex items-center gap-1"
          data-testid="button-skill-map"
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
        ) : isError || !coursesData || coursesData.length === 0 ? (
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
                
                if (course.subcategories && course.subcategories.length > 0) {
                  course.subcategories.forEach(subcat => {
                    totalLessons += subcat.lessons.length;
                    completedLessons += subcat.lessons.filter(l => l.completed).length;
                  });
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
                        {course.subcategories && course.subcategories.length > 0 ? (
                          course.subcategories.map((subcat) => {
                            const subcatKey = `${course.id}-${subcat.id}`;
                            const isSubcatOpen = openSubcategories[subcatKey] || false;
                            
                            return (
                              <Collapsible
                                key={subcatKey}
                                open={isSubcatOpen}
                                onOpenChange={() => toggleSubcategory(subcatKey)}
                              >
                                <CollapsibleTrigger 
                                  className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-800/30 transition-colors"
                                  data-testid={`button-subcategory-${subcatKey}`}
                                >
                                  <ChevronRight 
                                    className={`h-3 w-3 text-gray-500 transition-transform ${isSubcatOpen ? 'rotate-90' : ''}`}
                                  />
                                  <span className="text-sm text-gray-300" data-testid={`text-subcategory-title-${subcatKey}`}>
                                    {subcat.title}
                                  </span>
                                </CollapsibleTrigger>
                                
                                <CollapsibleContent>
                                  <div className="ml-5 mt-1 space-y-1">
                                    {subcat.lessons.map((lesson) => (
                                      <div 
                                        key={lesson.id}
                                        className="flex items-center justify-between p-2 rounded hover:bg-gray-800/20 transition-colors"
                                        data-testid={`container-lesson-${lesson.id}`}
                                      >
                                        <div className="flex items-center gap-2 flex-1">
                                          <Checkbox
                                            checked={lesson.completed}
                                            onCheckedChange={() => handleLessonToggle(lesson.id, lesson.completed)}
                                            className="border-gray-500"
                                            data-testid={`checkbox-lesson-${lesson.id}`}
                                          />
                                          <a
                                            href={lesson.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                                            data-testid={`link-lesson-${lesson.id}`}
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
                              </Collapsible>
                            );
                          })
                        ) : (
                          <div className="ml-5 space-y-1">
                            {course.lessons.map((lesson) => (
                              <div 
                                key={lesson.id}
                                className="flex items-center justify-between p-2 rounded hover:bg-gray-800/20 transition-colors"
                                data-testid={`container-lesson-${lesson.id}`}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <Checkbox
                                    checked={lesson.completed}
                                    onCheckedChange={() => handleLessonToggle(lesson.id, lesson.completed)}
                                    className="border-gray-500"
                                    data-testid={`checkbox-lesson-${lesson.id}`}
                                  />
                                  <a
                                    href={lesson.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                                    data-testid={`link-lesson-${lesson.id}`}
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
