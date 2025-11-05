import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, Folder, FolderOpen, FileText } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SkillMapping {
  problem: string;
  skills: string[];
  skillUrls?: string[];
}

interface CategoryData {
  category: string;
  mappings: SkillMapping[];
}

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

  console.log('[LifeSkillsMap] Component rendered');

  // Fetch course tracking data
  const { data: coursesData, isLoading, error, isError } = useQuery<CourseTrackingData[]>({
    queryKey: ['/api/courses/tracking'],
  });

  console.log('[LifeSkillsMap] Query state:', { 
    isLoading, 
    isError, 
    error: error ? String(error) : null,
    dataLength: coursesData?.length 
  });

  // Mutation to toggle lesson completion
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
    <Card className="w-full border-2 border-primary/30 dark:border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10" data-testid="card-life-skills-map">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Life Problems & Life Skill Map
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Explore our course library in a structured, tree-based format
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading course library...</p>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-full border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-background p-4">
              {/* Tree View */}
              <div className="space-y-1">
                {(coursesData || []).map((course, courseIdx) => {
                  // Calculate progress for this course
                  let totalLessons = 0;
                  let completedLessons = 0;
                  
                  // Count lessons in subcategories
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
                  
                  return (
                    <div key={`course-${courseIdx}`} className="space-y-0.5">
                      {/* Course (Level 0) */}
                      <Collapsible
                        open={openCategories[course.title]}
                        onOpenChange={() => toggleCategory(course.title)}
                        data-testid={`collapsible-category-${courseIdx}`}
                      >
                        <div className="space-y-1">
                          <CollapsibleTrigger 
                            className="flex items-center gap-2 w-full hover-elevate active-elevate-2 rounded-md px-2 py-1.5 text-left transition-all" 
                            data-testid={`button-toggle-${course.title.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <ChevronRight className={`h-4 w-4 text-primary transition-transform duration-200 flex-shrink-0 ${openCategories[course.title] ? 'transform rotate-90' : ''}`} />
                            {openCategories[course.title] ? (
                              <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
                            ) : (
                              <Folder className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                            <span className="font-bold text-sm text-primary dark:text-accent">
                              {course.title}
                            </span>
                          </CollapsibleTrigger>
                          
                          {/* Progress Bar */}
                          <div className="flex items-center gap-2 px-2 ml-8">
                            <Progress value={progressPercent} className="h-2 flex-1" data-testid={`progress-course-${courseIdx}`} />
                            <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-right">
                              {completedLessons}/{totalLessons} ({progressPercent}%)
                            </span>
                          </div>
                        </div>

                      <CollapsibleContent>
                        <div className="ml-6 border-l-2 border-muted-foreground/20 pl-1 space-y-0.5 mt-0.5">
                          {/* If course has subcategories, show them */}
                          {course.subcategories && course.subcategories.length > 0 ? (
                            course.subcategories.map((subcategory, subcatIdx) => {
                              const subcatKey = `${course.id}-${subcategory.id}`;
                              return (
                                <div key={`subcategory-${subcatIdx}`} className="space-y-0.5">
                                  {/* Subcategory (Level 1) */}
                                  <Collapsible
                                    open={openSubcategories[subcatKey]}
                                    onOpenChange={() => toggleSubcategory(subcatKey)}
                                    data-testid={`collapsible-subcategory-${courseIdx}-${subcatIdx}`}
                                  >
                                    <CollapsibleTrigger 
                                      className="flex items-center gap-2 w-full hover-elevate active-elevate-2 rounded-md px-2 py-1 text-left transition-all" 
                                      data-testid={`button-toggle-${subcategory.title.toLowerCase().replace(/\s+/g, '-')}`}
                                    >
                                      <ChevronRight className={`h-3.5 w-3.5 text-accent transition-transform duration-200 flex-shrink-0 ${openSubcategories[subcatKey] ? 'transform rotate-90' : ''}`} />
                                      {openSubcategories[subcatKey] ? (
                                        <FolderOpen className="h-4 w-4 text-accent flex-shrink-0" />
                                      ) : (
                                        <Folder className="h-4 w-4 text-accent flex-shrink-0" />
                                      )}
                                      <span className="font-medium text-sm text-accent dark:text-accent/90">
                                        {subcategory.title}
                                      </span>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                      <div className="ml-6 border-l-2 border-muted-foreground/15 pl-1 space-y-0.5 mt-0.5">
                                        {/* Lessons (Level 2) */}
                                        {subcategory.lessons.map((lesson, lessonIdx) => (
                                          <div 
                                            key={`lesson-${courseIdx}-${subcatIdx}-${lessonIdx}`}
                                            className="flex items-center gap-2 px-2 py-1 hover-elevate active-elevate-2 rounded-md transition-all"
                                            data-testid={`row-skill-mapping-${courseIdx}-${subcatIdx}-${lessonIdx}`}
                                          >
                                            <Checkbox
                                              checked={lesson.completed}
                                              onCheckedChange={() => handleLessonToggle(lesson.id, lesson.completed)}
                                              className="flex-shrink-0"
                                              data-testid={`checkbox-lesson-${courseIdx}-${subcatIdx}-${lessonIdx}`}
                                            />
                                            <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            <a
                                              href={lesson.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-foreground hover:text-primary dark:hover:text-accent transition-colors flex-1"
                                              data-testid={`link-skill-${courseIdx}-${subcatIdx}-${lessonIdx}`}
                                            >
                                              {lesson.title}
                                            </a>
                                            <span className="text-xs font-medium text-accent dark:text-accent/80 flex-shrink-0">
                                              10 pts
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </div>
                              );
                            })
                          ) : course.lessons.length > 0 ? (
                            /* If no subcategories, show flat lessons (Level 1) */
                            course.lessons.map((lesson, lessonIdx) => (
                              <div 
                                key={`lesson-${courseIdx}-${lessonIdx}`}
                                className="flex items-center gap-2 px-2 py-1 hover-elevate active-elevate-2 rounded-md transition-all"
                                data-testid={`row-skill-mapping-${courseIdx}-${lessonIdx}`}
                              >
                                <Checkbox
                                  checked={lesson.completed}
                                  onCheckedChange={() => handleLessonToggle(lesson.id, lesson.completed)}
                                  className="flex-shrink-0"
                                  data-testid={`checkbox-lesson-${courseIdx}-${lessonIdx}`}
                                />
                                <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <a
                                  href={lesson.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-foreground hover:text-primary dark:hover:text-accent transition-colors flex-1"
                                  data-testid={`link-skill-${courseIdx}-${lessonIdx}`}
                                >
                                  {lesson.title}
                                </a>
                                <span className="text-xs font-medium text-accent dark:text-accent/80 flex-shrink-0">
                                  10 pts
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-muted-foreground italic px-2 py-1">
                              No lessons available
                            </div>
                          )}
                        </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
