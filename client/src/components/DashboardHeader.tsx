import { useState } from 'react';
import { Menu, X, Trophy, Moon, Sun } from 'lucide-react';
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
}

export default function DashboardHeader({
  userName = 'User',
  userPoints = 0,
  isAdmin = false,
  onNavigate = () => {},
  activeSection = 'hercm'
}: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    console.log('Dark mode toggled:', !darkMode);
  };

  const navItems = [
    { id: 'hercm', label: 'HERCM' },
    { id: 'rituals', label: 'Daily Rituals' },
    { id: 'courses', label: 'Courses' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <span className="hidden sm:block text-xl font-semibold text-foreground">
              Platinum HERCM
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? 'default' : 'ghost'}
                onClick={() => onNavigate(item.id)}
                data-testid={`nav-${item.id}`}
                className="font-medium"
              >
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1 hidden sm:flex" data-testid="badge-points">
              <Trophy className="w-4 h-4 text-chart-2" />
              <span className="font-semibold">{userPoints}</span>
            </Badge>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              data-testid="button-theme-toggle"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <Avatar className="w-8 h-8" data-testid="avatar-user">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

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
                  className="w-full justify-start"
                  data-testid={`nav-mobile-${item.id}`}
                >
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
