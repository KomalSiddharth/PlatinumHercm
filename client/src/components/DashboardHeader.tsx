import { useState, useEffect } from 'react';
import { Menu, X, Trophy, Moon, Sun, User as UserIcon } from 'lucide-react';
import Logo from './Logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface DashboardHeaderProps {
  userName?: string;
  userPoints?: number;
  isAdmin?: boolean;
  onNavigate?: (section: string) => void;
  activeSection?: string;
  onProfileClick?: () => void;
}

export default function DashboardHeader({
  userName = 'User',
  userPoints = 0,
  isAdmin = false,
  onNavigate = () => {},
  activeSection = 'hrcm',
  onProfileClick = () => {}
}: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Force light mode
  
  // Safety check: Ensure userName is never null/undefined
  const displayName = userName || 'User';

  // Force light mode - remove dark class
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light'); // Override any saved dark theme
    setDarkMode(false);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Toggle dark class on document
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    console.log('Dark mode toggled:', newDarkMode);
  };

  const navItems = [
    { id: 'hrcm', label: 'HRCM' },
    { id: 'courses', label: 'Courses' },
    { id: 'rituals', label: 'Daily Rituals' },
    { id: 'emotional', label: 'Emotional Tracker' },
    { id: 'achievements', label: 'Achievements' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="hidden sm:block text-lg sm:text-xl font-semibold text-foreground">
              Platinum HRCM
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? 'default' : 'ghost'}
                onClick={() => onNavigate(item.id)}
                data-testid={`nav-${item.id}`}
                className={`font-medium ${
                  activeSection === item.id 
                    ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90' 
                    : ''
                }`}
              >
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <Badge 
              className="gap-0.5 sm:gap-1 hidden sm:flex bg-gradient-to-r from-primary to-accent text-white border-0 text-xs px-1.5 sm:px-2" 
              data-testid="badge-points"
            >
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-semibold text-[10px] sm:text-xs">{userPoints}</span>
            </Badge>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              data-testid="button-theme-toggle"
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onProfileClick}
              data-testid="button-profile"
              className="relative h-8 w-8 sm:h-9 sm:w-9"
            >
              <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs sm:text-sm font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>

            {isAdmin && (
              <Button variant="outline" size="sm" data-testid="button-admin" className="hidden sm:inline-flex text-xs px-2 sm:px-3">
                Admin
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-3 sm:py-4 border-t">
            <nav className="flex flex-col gap-1.5 sm:gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeSection === item.id ? 'default' : 'ghost'}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full justify-start text-sm ${
                    activeSection === item.id 
                      ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90' 
                      : ''
                  }`}
                  data-testid={`nav-mobile-${item.id}`}
                >
                  {item.label}
                </Button>
              ))}
              <div className="pt-2 mt-2 border-t">
                <Badge className="w-full justify-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 bg-gradient-to-r from-primary to-accent text-white border-0 text-xs sm:text-sm">
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="font-semibold">{userPoints} Points</span>
                </Badge>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
