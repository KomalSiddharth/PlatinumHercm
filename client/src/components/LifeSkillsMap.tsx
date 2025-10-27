import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  return (
    <Card className="w-full border-2 border-primary/30 dark:border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10" data-testid="card-life-skills-map">
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Life Problems & Life Skill Map
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" data-testid="table-life-skills">
            <thead>
              <tr>
                <th 
                  className="bg-red-600 text-white font-bold text-lg p-3 text-left border border-gray-300"
                  data-testid="header-problems"
                >
                  Problems
                </th>
                <th 
                  className="bg-green-600 text-white font-bold text-lg p-3 text-left border border-gray-300"
                  data-testid="header-life-skills"
                >
                  Life Skills
                </th>
              </tr>
            </thead>
            <tbody>
              {lifeSkillsData.map((category, categoryIdx) => (
                <>
                  {/* Category Header Row */}
                  <tr key={`category-${categoryIdx}`}>
                    <td 
                      colSpan={2} 
                      className="bg-blue-100 dark:bg-blue-900/30 font-bold text-center p-2 border border-gray-300"
                      data-testid={`category-${category.category.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {category.category}
                    </td>
                  </tr>
                  
                  {/* Mapping Rows */}
                  {category.mappings.map((mapping, mappingIdx) => (
                    <tr 
                      key={`mapping-${categoryIdx}-${mappingIdx}`}
                      className={mappingIdx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}
                      data-testid={`row-skill-mapping-${categoryIdx}-${mappingIdx}`}
                    >
                      <td className="p-2.5 border border-gray-300 align-top">
                        <span className="text-sm md:text-base">{mapping.problem}</span>
                      </td>
                      <td className="p-2.5 border border-gray-300 align-top">
                        <div className="flex flex-col gap-1">
                          {mapping.skills.map((skill, skillIdx) => (
                            <a
                              key={`skill-${categoryIdx}-${mappingIdx}-${skillIdx}`}
                              href={mapping.skillUrls?.[skillIdx] || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline text-sm md:text-base"
                              data-testid={`link-skill-${categoryIdx}-${mappingIdx}-${skillIdx}`}
                            >
                              {skill}
                            </a>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
