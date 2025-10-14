import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserActivity {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  latestWeek: {
    weekNumber: number;
    healthRating: number;
    relationshipRating: number;
    careerRating: number;
    moneyRating: number;
    healthProblem: string;
    relationshipProblem: string;
    careerProblem: string;
    moneyProblem: string;
    overallScore: number;
  } | null;
  totalWeeks: number;
}

export default function UserActivitySearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: users, isLoading, error } = useQuery<UserActivity[]>({
    queryKey: [`/api/admin/search-user-by-name?name=${searchTerm}`],
    enabled: !!searchTerm,
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name to search",
        variant: "destructive",
      });
      return;
    }
    setSearchTerm(searchQuery.trim());
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (rating >= 5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Health': return '💪';
      case 'Relationship': return '❤️';
      case 'Career': return '💼';
      case 'Money': return '💰';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search User Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter user name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              data-testid="input-name-search"
            />
            <Button 
              onClick={handleSearch}
              disabled={isLoading}
              data-testid="button-search-by-name"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Searching...
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-6 flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span>No users found</span>
          </CardContent>
        </Card>
      )}

      {users && users.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Found {users.length} user{users.length > 1 ? 's' : ''}
          </p>
          
          {users.map((user) => (
            <Card key={user.id} className="hover-elevate" data-testid={`card-user-${user.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold" data-testid={`text-user-name-${user.id}`}>
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      Week {user.latestWeek?.weekNumber || 0}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {user.totalWeeks} total weeks
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              {user.latestWeek && (
                <CardContent className="pt-0">
                  {/* Overall Score */}
                  <div className="mb-3 p-2 bg-muted/50 rounded-md flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      Overall Score
                    </span>
                    <Badge className={getRatingColor(user.latestWeek.overallScore)}>
                      {user.latestWeek.overallScore}/10
                    </Badge>
                  </div>

                  {/* HRCM Ratings Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { category: 'Health', rating: user.latestWeek.healthRating, problem: user.latestWeek.healthProblem },
                      { category: 'Relationship', rating: user.latestWeek.relationshipRating, problem: user.latestWeek.relationshipProblem },
                      { category: 'Career', rating: user.latestWeek.careerRating, problem: user.latestWeek.careerProblem },
                      { category: 'Money', rating: user.latestWeek.moneyRating, problem: user.latestWeek.moneyProblem },
                    ].map(({ category, rating, problem }) => (
                      <div 
                        key={category} 
                        className="p-2 border rounded-md"
                        data-testid={`card-${category.toLowerCase()}-${user.id}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium flex items-center gap-1">
                            <span>{getCategoryIcon(category)}</span>
                            {category}
                          </span>
                          <Badge 
                            className={`${getRatingColor(rating)} text-xs h-5`}
                            data-testid={`badge-${category.toLowerCase()}-rating-${user.id}`}
                          >
                            {rating}/10
                          </Badge>
                        </div>
                        {problem && (
                          <p 
                            className="text-xs text-muted-foreground line-clamp-2"
                            data-testid={`text-${category.toLowerCase()}-problem-${user.id}`}
                          >
                            {problem}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              
              {!user.latestWeek && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground text-center">No activity data available</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
