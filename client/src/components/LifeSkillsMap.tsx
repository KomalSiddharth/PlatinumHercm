import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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

  // Fetch course tracking data
  const { data: coursesData, isLoading } = useQuery<CourseTrackingData[]>({
    queryKey: ['/api/courses/tracking'],
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

  return (
    <Card className="w-full border-2 border-primary/30 dark:border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10" data-testid="card-life-skills-map">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Life Problems & Life Skill Map
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Map your problems to actionable skills and resources from our course library
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
            <div className="min-w-full border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Table Headers */}
              <div className="grid grid-cols-2 border-b border-gray-300 dark:border-gray-700">
                <div className="p-1.5 sm:p-2 font-bold text-xs sm:text-sm text-center border-r border-gray-300 dark:border-gray-700 text-white" style={{ backgroundColor: '#bc0000' }}>
                  Life Problem
                </div>
                <div className="p-1.5 sm:p-2 font-bold text-xs sm:text-sm text-center text-white" style={{ backgroundColor: '#006400' }}>
                  Life Skills
                </div>
              </div>

              {/* Courses */}
              {(coursesData || []).map((course, courseIdx) => (
                <Collapsible
                  key={`course-${courseIdx}`}
                  open={openCategories[course.title]}
                  onOpenChange={() => toggleCategory(course.title)}
                  data-testid={`collapsible-category-${courseIdx}`}
                >
                  {/* Course Header */}
                  <CollapsibleTrigger 
                    className="w-full bg-primary/10 dark:bg-primary/20 hover:bg-primary/15 dark:hover:bg-primary/25 transition-colors border-b border-primary/10" 
                    data-testid={`button-toggle-${course.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center justify-center gap-1.5 p-1.5 sm:p-2">
                      <h3 className="font-bold text-xs sm:text-sm text-center text-primary dark:text-accent">
                        {course.title}
                      </h3>
                      <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary dark:text-accent transition-transform duration-200 ${openCategories[course.title] ? 'transform rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {/* If course has subcategories, show them as nested collapsibles */}
                    {course.subcategories && course.subcategories.length > 0 ? (
                      <div>
                        {course.subcategories.map((subcategory, subcatIdx) => {
                          const subcatKey = `${course.id}-${subcategory.id}`;
                          return (
                            <Collapsible
                              key={`subcategory-${subcatIdx}`}
                              open={openSubcategories[subcatKey]}
                              onOpenChange={() => toggleSubcategory(subcatKey)}
                              data-testid={`collapsible-subcategory-${courseIdx}-${subcatIdx}`}
                            >
                              {/* Subcategory Header */}
                              <CollapsibleTrigger 
                                className="w-full bg-accent/10 dark:bg-accent/20 hover:bg-accent/15 dark:hover:bg-accent/25 transition-colors border-b border-accent/10" 
                                data-testid={`button-toggle-${subcategory.title.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                <div className="flex items-center justify-center gap-1.5 p-1.5 sm:p-2 pl-6">
                                  <h4 className="font-semibold text-xs sm:text-sm text-center text-accent dark:text-accent/90">
                                    {subcategory.title}
                                  </h4>
                                  <ChevronDown className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent dark:text-accent/90 transition-transform duration-200 ${openSubcategories[subcatKey] ? 'transform rotate-180' : ''}`} />
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                {/* Subcategory Lessons Table */}
                                <div className="max-h-[400px] overflow-y-auto">
                                  <table className="w-full border-collapse">
                                    <tbody>
                                      {subcategory.lessons.map((lesson, lessonIdx) => (
                                        <tr 
                                          key={`lesson-${courseIdx}-${subcatIdx}-${lessonIdx}`}
                                          className={lessonIdx % 2 === 0 ? 'bg-white dark:bg-gray-900/50' : 'bg-gray-50 dark:bg-gray-800/50'}
                                          data-testid={`row-skill-mapping-${courseIdx}-${subcatIdx}-${lessonIdx}`}
                                        >
                                          <td className="w-1/2 p-1 sm:p-1.5 border-b border-gray-200 dark:border-gray-700 align-top">
                                            <span className="text-xs">{lesson.title}</span>
                                          </td>
                                          <td className="w-1/2 p-1 sm:p-1.5 border-b border-gray-200 dark:border-gray-700 align-top">
                                            <div className="flex flex-col gap-0.5">
                                              <a
                                                href={lesson.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 dark:text-blue-400 hover:underline text-xs break-all"
                                                data-testid={`link-skill-${courseIdx}-${subcatIdx}-${lessonIdx}`}
                                              >
                                                {lesson.title}
                                              </a>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    ) : (
                      /* If no subcategories, show flat lessons */
                      <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full border-collapse">
                          <tbody>
                            {course.lessons.map((lesson, lessonIdx) => (
                              <tr 
                                key={`lesson-${courseIdx}-${lessonIdx}`}
                                className={lessonIdx % 2 === 0 ? 'bg-white dark:bg-gray-900/50' : 'bg-gray-50 dark:bg-gray-800/50'}
                                data-testid={`row-skill-mapping-${courseIdx}-${lessonIdx}`}
                              >
                                <td className="w-1/2 p-1 sm:p-1.5 border-b border-gray-200 dark:border-gray-700 align-top">
                                  <span className="text-xs">{lesson.title}</span>
                                </td>
                                <td className="w-1/2 p-1 sm:p-1.5 border-b border-gray-200 dark:border-gray-700 align-top">
                                  <div className="flex flex-col gap-0.5">
                                    <a
                                      href={lesson.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 hover:underline text-xs break-all"
                                      data-testid={`link-skill-${courseIdx}-${lessonIdx}`}
                                    >
                                      {lesson.title}
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
