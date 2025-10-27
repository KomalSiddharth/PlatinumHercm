import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface SkillMapping {
  problem: string;
  skills: string[];
  skillUrls?: string[];
}

interface CategoryData {
  category: string;
  mappings: SkillMapping[];
}

const lifeSkillsData: CategoryData[] = [
  {
    category: "Basic LOA",
    mappings: [
      {
        problem: "Tuning Frequency To Attract Goals",
        skills: ["Memorise The Science of Why LOA Works"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Attract Any Goal by Tuning your Frequency",
        skills: ["Master Making Affirmations to Tune Frequency"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Maintaining your Frequency throughout the day",
        skills: ["Follow Routine of LOA - 10RG, Water Bottle, Affirmations, Double Happiness, Cancel Cancel & Keep Filling up Magic Diary."],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Clearing Negative Energy",
        skills: ["Experience Ho Opono to Clear Your Negative Energy"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Sub-Conscious Programming",
        skills: ["Practice DMP with me Everyday for Deep Subconscious Programming - Also Use Recordings for Regular Programming"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Ultimate Life Vision",
        skills: ["Ultimate Auto-Biography"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Short Term Life Vision",
        skills: ["Create Your Vision Board", "Create Magic Miracles Diary"],
        skillUrls: ["https://coaching.miteshkhatri.com/", "https://coaching.miteshkhatri.com/"]
      }
    ]
  },
  {
    category: "Health Mastery",
    mappings: [
      {
        problem: "Health Problems",
        skills: ["1. Master Understanding Health"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Limiting Health Beliefs",
        skills: ["2. Breaking Limiting Health Habits"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Weight Loss & Gain, How to Create a Diet Plan and Still Lose Weight",
        skills: ["3. Master the Lifestyle Diet Plans"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Motivation for Weight Loss",
        skills: ["4. Master the 7 Steps to Love Exercising"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "What Workouts to Do",
        skills: ["5. Master Designing your Own Workouts"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      }
    ]
  }
];

export default function LifeSkillsMap() {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "Basic LOA": true,
    "Health Mastery": true,
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <Card className="w-full border-2 border-primary/30 dark:border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10" data-testid="card-life-skills-map">
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Life Problems & Life Skill Map
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="border-2 border-primary/20 dark:border-primary/30 rounded-lg overflow-hidden shadow-md">
          {/* Common Table Headers */}
          <div className="sticky top-0 z-20 grid grid-cols-2">
            <div 
              className="bg-red-600 text-white font-semibold text-xs sm:text-sm p-2 sm:p-2.5 text-center border-b-2 border-white/20"
              data-testid="header-problems-common"
            >
              Problems
            </div>
            <div 
              className="bg-green-600 text-white font-semibold text-xs sm:text-sm p-2 sm:p-2.5 text-center border-b-2 border-white/20"
              data-testid="header-life-skills-common"
            >
              Life Skills
            </div>
          </div>

          {/* Scrollable Content Container */}
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            {/* Category Sections */}
            {lifeSkillsData.map((category, categoryIdx) => (
              <Collapsible 
                key={`category-${categoryIdx}`}
                open={openCategories[category.category]}
                onOpenChange={() => toggleCategory(category.category)}
              >
                {/* Category Header */}
                <CollapsibleTrigger 
                  className="w-full bg-primary/10 dark:bg-primary/20 hover:bg-primary/15 dark:hover:bg-primary/25 transition-colors border-b border-primary/10" 
                  data-testid={`button-toggle-${category.category.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center justify-between p-2 sm:p-2.5">
                    <h3 className="font-bold text-sm sm:text-base text-primary dark:text-primary/90">
                      {category.category}
                    </h3>
                    <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-primary transition-transform duration-200 ${openCategories[category.category] ? 'transform rotate-180' : ''}`} />
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
                          <td className="w-1/2 p-2 sm:p-2.5 border-b border-gray-200 dark:border-gray-700 align-top">
                            <span className="text-xs sm:text-sm">{mapping.problem}</span>
                          </td>
                          <td className="w-1/2 p-2 sm:p-2.5 border-b border-gray-200 dark:border-gray-700 align-top">
                            <div className="flex flex-col gap-1">
                              {mapping.skills.map((skill, skillIdx) => (
                                <a
                                  key={`skill-${categoryIdx}-${mappingIdx}-${skillIdx}`}
                                  href={mapping.skillUrls?.[skillIdx] || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline text-xs sm:text-sm"
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
      </CardContent>
    </Card>
  );
}
