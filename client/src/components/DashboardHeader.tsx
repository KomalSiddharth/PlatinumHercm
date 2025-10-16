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
  const [darkMode, setDarkMode] = useState(false);
  
  // Safety check: Ensure userName is never null/undefined
  const displayName = userName || 'User';

  // Initialize theme from localStorage or system preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    if (shouldBeDark) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark');
    // Persist theme preference
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const navItems = [
    { id: 'hrcm', label: 'HRCM' },
    { id: 'rituals', label: 'Daily Rituals' },
    { id: 'courses', label: 'Courses' },
    { id: 'achievements', label: 'Achievements' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <span className="hidden sm:block text-xl font-semibold text-foreground">
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
                className={`font-medium transition-all ${
                  activeSection === item.id 
                    ? 'bg-brand-gradient text-white shadow-md hover:shadow-lg hover-lift' 
                    : 'hover:text-primary'
                }`}
              >
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Badge 
              variant="secondary" 
              className="gap-1 hidden sm:flex bg-brand-gradient text-white border-0 shadow-sm px-3 py-1.5" 
              data-testid="badge-points"
            >
              <Trophy className="w-4 h-4" />
              <span className="font-semibold">{userPoints}</span>
            </Badge>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              data-testid="button-theme-toggle"
              className="hover:text-primary transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onProfileClick}
              data-testid="button-profile"
              className="relative hover:scale-105 transition-transform"
            >
              <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-brand-gradient text-white text-sm font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>

            {isAdmin && (
              <Button variant="outline" size="sm" data-testid="button-admin">
                Admin
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeSection === item.id ? 'default' : 'ghost'}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full justify-start font-medium transition-all ${
                    activeSection === item.id 
                      ? 'bg-brand-gradient text-white shadow-md' 
                      : 'hover:text-primary'
                  }`}
                  data-testid={`nav-mobile-${item.id}`}
                >
                  {item.label}
                </Button>
              ))}
              <div className="pt-2 mt-2 border-t">
                <Badge variant="secondary" className="w-full justify-center gap-2 py-2 bg-brand-gradient text-white border-0">
                  <Trophy className="w-4 h-4" />
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
