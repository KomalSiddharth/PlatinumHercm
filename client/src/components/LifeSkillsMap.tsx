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
}

export default function LifeSkillsMap() {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  // Fetch course tracking data
  const { data: coursesData, isLoading } = useQuery<CourseTrackingData[]>({
    queryKey: ['/api/courses/tracking'],
  });

  // Transform course tracking data to life skills format
  const lifeSkillsData: CategoryData[] = (coursesData || []).map(course => ({
    category: course.title,
    mappings: course.lessons.map(lesson => ({
      problem: lesson.title,
      skills: [lesson.title],
      skillUrls: [lesson.url]
    }))
  }));

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <Card className="w-full" data-testid="card-life-skills-map">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl sm:text-2xl font-bold text-primary dark:text-primary/90">
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
                <div className="p-1.5 sm:p-2 font-bold text-xs sm:text-sm text-center border-r border-gray-300 dark:border-gray-700 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                  Life Problem
                </div>
                <div className="p-1.5 sm:p-2 font-bold text-xs sm:text-sm text-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  Life Skills
                </div>
              </div>

              {/* Categories */}
              {lifeSkillsData.map((category, categoryIdx) => (
                <Collapsible
                  key={`category-${categoryIdx}`}
                  open={openCategories[category.category]}
                  onOpenChange={() => toggleCategory(category.category)}
                  data-testid={`collapsible-category-${categoryIdx}`}
                >
                  {/* Category Header */}
                  <CollapsibleTrigger 
                    className="w-full bg-primary/10 dark:bg-primary/20 hover:bg-primary/15 dark:hover:bg-primary/25 transition-colors border-b border-primary/10" 
                    data-testid={`button-toggle-${category.category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center justify-center gap-1.5 p-1.5 sm:p-2">
                      <h3 className="font-bold text-xs sm:text-sm text-primary dark:text-primary/90 text-center">
                        {category.category}
                      </h3>
                      <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary transition-transform duration-200 ${openCategories[category.category] ? 'transform rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {/* Category Content Table */}
                    <table className="w-full border-collapse">
                      <tbody>
                        {category.mappings.map((mapping, mappingIdx) => (
                          <tr 
                            key={`mapping-${categoryIdx}-${mappingIdx}`}
                            className={mappingIdx % 2 === 0 ? 'bg-white dark:bg-gray-900/50' : 'bg-gray-50 dark:bg-gray-800/50'}
                            data-testid={`row-skill-mapping-${categoryIdx}-${mappingIdx}`}
                          >
                            <td className="w-1/2 p-1 sm:p-1.5 border-b border-gray-200 dark:border-gray-700 align-top">
                              <span className="text-xs">{mapping.problem}</span>
                            </td>
                            <td className="w-1/2 p-1 sm:p-1.5 border-b border-gray-200 dark:border-gray-700 align-top">
                              <div className="flex flex-col gap-0.5">
                                {mapping.skills.map((skill, skillIdx) => (
                                  <a
                                    key={`skill-${categoryIdx}-${mappingIdx}-${skillIdx}`}
                                    href={mapping.skillUrls?.[skillIdx] || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline text-xs break-all"
                                    data-testid={`link-skill-${categoryIdx}-${mappingIdx}-${skillIdx}`}
                                  >
                                    {skill}
                                  </a>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
