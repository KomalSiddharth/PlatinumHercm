import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CourseModule {
  id: string;
  title: string;
  url?: string;
  completed?: boolean;
}

interface CourseSubcategory {
  id: string;
  title: string;
  lessons: CourseModule[];
}

interface CourseCardProps {
  id: string;
  title: string;
  url?: string;
  tags: string[];
  source: string;
  estimatedHours: number;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercent: number;
  modules?: CourseModule[];
  subcategories?: CourseSubcategory[];
  completedModules?: string[];
  onUpdateProgress?: (id: string) => void;
  onVisit?: (id: string) => void;
  onModuleToggle?: (courseId: string, moduleId: string, completed: boolean) => void;
  category?: string;
}

const statusConfig = {
  not_started: { label: 'Not Started', variant: 'secondary' as const, color: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', variant: 'default' as const, color: 'text-chart-4' },
  completed: { label: 'Completed', variant: 'outline' as const, color: 'text-chart-3' }
};

// Bright colorful gradients for each category
const categoryColors = {
  Health: 'bg-gradient-to-r from-pink-500 to-rose-500',
  Relationship: 'bg-gradient-to-r from-purple-500 to-indigo-500',
  Career: 'bg-gradient-to-r from-blue-500 to-cyan-500',
  Money: 'bg-gradient-to-r from-emerald-500 to-teal-500',
  default: 'bg-gradient-to-r from-orange-500 to-amber-500'
};

export default function CourseCard({
  id,
  title,
  url,
  tags,
  source,
  estimatedHours,
  status: initialStatus,
  progressPercent: initialProgress,
  modules = [],
  subcategories = [],
  completedModules = [],
  onUpdateProgress = () => {},
  onVisit = () => {},
  onModuleToggle = () => {},
  category = 'default'
}: CourseCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubcategories, setOpenSubcategories] = useState<Record<string, boolean>>({});
  const [localCompletedModules, setLocalCompletedModules] = useState<string[]>(completedModules);
  
  // Calculate total lessons including subcategories
  const directModules = modules.length;
  const subcategoryLessons = subcategories.reduce((sum, sub) => sum + sub.lessons.length, 0);
  const totalModules = directModules + subcategoryLessons || 1;
  
  const completedCount = localCompletedModules.length;
  const calculatedProgress = Math.round((completedCount / totalModules) * 100);
  
  // Auto-determine status based on progress
  const calculatedStatus: 'not_started' | 'in_progress' | 'completed' = 
    calculatedProgress === 0 ? 'not_started' :
    calculatedProgress === 100 ? 'completed' : 'in_progress';
  
  const config = statusConfig[calculatedStatus];
  const firstLetter = title.charAt(0).toUpperCase();
  const gradientClass = categoryColors[category as keyof typeof categoryColors] || categoryColors.default;

  const handleModuleToggle = (moduleId: string, completed: boolean) => {
    const newCompleted = completed 
      ? [...localCompletedModules, moduleId]
      : localCompletedModules.filter(id => id !== moduleId);
    
    setLocalCompletedModules(newCompleted);
    onModuleToggle(id, moduleId, completed);
  };

  const toggleSubcategory = (subcategoryId: string) => {
    setOpenSubcategories(prev => ({
      ...prev,
      [subcategoryId]: !prev[subcategoryId]
    }));
  };

  // Show dropdown if modules or subcategories exist
  const showDropdown = modules.length > 0 || subcategories.length > 0;

  return (
    <div className={`${gradientClass} rounded-lg p-6 hover-elevate shadow-lg`}>
      <div className="flex items-center gap-4">
        {/* Colorful Icon */}
        <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border-2 border-white/40">
          <span className="text-3xl font-bold text-white">{firstLetter}</span>
        </div>

        {/* Course Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1 text-white">{title}</h3>
            <p className="text-sm text-white/80">{source}</p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="secondary" className="gap-1 bg-white/20 text-white border-white/40">
              <GraduationCap className="w-3 h-3" />
              {config.label}
            </Badge>

            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs bg-white/20 text-white border-white/40">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Progress Bar - Always visible */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">Progress</span>
              <span className="font-medium text-white">{calculatedProgress}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/80 transition-all duration-300"
                style={{ width: `${calculatedProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dropdown Button for Modules */}
        {showDropdown && (
          <div className="flex-shrink-0">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-white hover:bg-white/20"
                  data-testid={`button-modules-${id}`}
                >
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Modules
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        )}
      </div>

      {/* Collapsible Module/Subcategory List */}
      {showDropdown && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-3">
              <p className="text-sm text-white/80 font-medium mb-3">
                {completedCount}/{totalModules} lessons completed
              </p>
              
              {/* Direct modules (if any) */}
              {modules.map((module) => (
                <div 
                  key={module.id} 
                  className="flex items-center gap-3 p-2 rounded hover:bg-white/10 transition-colors"
                  data-testid={`module-item-${module.id}`}
                >
                  <Checkbox
                    checked={localCompletedModules.includes(module.id)}
                    onCheckedChange={(checked) => handleModuleToggle(module.id, checked as boolean)}
                    className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                    data-testid={`checkbox-module-${module.id}`}
                  />
                  <label className="text-sm text-white cursor-pointer flex-1" onClick={() => {
                    const isChecked = localCompletedModules.includes(module.id);
                    handleModuleToggle(module.id, !isChecked);
                  }}>
                    {module.title}
                  </label>
                  {module.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/20"
                      onClick={() => window.open(module.url, '_blank')}
                      data-testid={`button-module-link-${module.id}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Button>
                  )}
                </div>
              ))}

              {/* Subcategories (nested collapsibles) */}
              {subcategories.map((subcategory) => (
                <div key={subcategory.id} className="border-l-2 border-white/30 pl-3">
                  <Collapsible 
                    open={openSubcategories[subcategory.id]} 
                    onOpenChange={() => toggleSubcategory(subcategory.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between text-white hover:bg-white/20 mb-2"
                        data-testid={`button-subcategory-${subcategory.id}`}
                      >
                        <span className="font-medium">{subcategory.title}</span>
                        {openSubcategories[subcategory.id] ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                        }
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {subcategory.lessons.map((lesson) => (
                        <div 
                          key={lesson.id} 
                          className="flex items-center gap-3 p-2 rounded hover:bg-white/10 transition-colors"
                          data-testid={`lesson-item-${lesson.id}`}
                        >
                          <Checkbox
                            checked={localCompletedModules.includes(lesson.id)}
                            onCheckedChange={(checked) => handleModuleToggle(lesson.id, checked as boolean)}
                            className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                            data-testid={`checkbox-lesson-${lesson.id}`}
                          />
                          <label className="text-sm text-white cursor-pointer flex-1" onClick={() => {
                            const isChecked = localCompletedModules.includes(lesson.id);
                            handleModuleToggle(lesson.id, !isChecked);
                          }}>
                            {lesson.title}
                          </label>
                          {lesson.url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/20"
                              onClick={() => window.open(lesson.url, '_blank')}
                              data-testid={`button-lesson-link-${lesson.id}`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </Button>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
