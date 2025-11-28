import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Trash2, Sparkles, Heart, Star, Clock, Pause, Play, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ArchivedTestimonialsModal } from './ArchivedTestimonialsModal';
import type { GratitudePost } from '@shared/schema';

interface GratitudeFeedProps {
  currentUserId?: string;
}

export default function GratitudeFeed({ currentUserId }: GratitudeFeedProps) {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const { data: posts = [], isLoading, refetch } = useQuery<GratitudePost[]>({
    queryKey: ['/api/gratitude-posts'],
    refetchInterval: 30000,
  });

  const createPostMutation = useMutation({
    mutationFn: async (newContent: string) => {
      const res = await apiRequest('/api/gratitude-posts', 'POST', { 
        content: newContent,
        category: 'gratitude'
      });
      return res.json();
    },
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['/api/gratitude-posts'] });
      toast({
        title: 'Shared!',
        description: 'Your gratitude has been shared with the team.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to share. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest(`/api/gratitude-posts/${postId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gratitude-posts'] });
      toast({
        title: 'Deleted',
        description: 'Your post has been removed.',
      });
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    createPostMutation.mutate(content.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || posts.length === 0 || isPaused) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const animate = () => {
      if (scrollContainer && !isPaused) {
        scrollPosition += scrollSpeed;
        if (scrollPosition >= scrollContainer.scrollWidth - scrollContainer.clientWidth) {
          scrollPosition = 0;
        }
        scrollContainer.scrollLeft = scrollPosition;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [posts.length, isPaused]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-amber-500',
      'bg-orange-500',
      'bg-rose-500',
      'bg-pink-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-blue-500',
      'bg-cyan-500',
      'bg-teal-500',
      'bg-emerald-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/30 dark:border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10">
        <CardContent className="pt-6">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share your weekly results, wins, or express gratitude for your progress and the support you've received... (Ctrl+Enter to share)"
              className="w-full h-28 p-4 border-2 border-primary/30 dark:border-primary/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-primary/5 dark:text-white resize-none text-base bg-white/50 dark:bg-gray-900/50"
              maxLength={1000}
              data-testid="textarea-share-gratitude"
            />
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {content.length}/1000
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || createPostMutation.isPending}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white gap-2"
                data-testid="button-share-gratitude"
              >
                <Send className="w-4 h-4" />
                {createPostMutation.isPending ? 'Sharing...' : 'Share'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setContent('')}
                disabled={!content}
                className="border-primary/30 dark:border-primary/50 text-primary dark:text-accent"
                data-testid="button-clear-gratitude"
              >
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Inspire others with your journey</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Team Gratitude Wall</h3>
              <Badge variant="secondary" className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-accent">
                {posts.length} posts
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="gap-2 text-muted-foreground hover:text-foreground"
              data-testid="button-pause-animation"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            style={{ scrollBehavior: isPaused ? 'smooth' : 'auto' }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <AnimatePresence mode="popLayout">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ 
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 300,
                    damping: 25
                  }}
                  className="flex-shrink-0 w-80"
                >
                  <Card className="h-full border-2 border-primary/20 dark:border-primary/40 bg-gradient-to-br from-white to-primary/5 dark:from-gray-900 dark:to-primary/10 hover:shadow-lg hover:shadow-primary/20 dark:hover:shadow-primary/30 transition-all duration-300 group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className={`w-10 h-10 ${getAvatarColor(post.userName)} text-white`}>
                          <AvatarFallback className="bg-transparent text-white text-sm font-semibold">
                            {getInitials(post.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm truncate">{post.userName}</span>
                            {post.userId === currentUserId && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 border-primary/30 text-primary dark:text-accent">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground/90 line-clamp-4 mb-2">
                            {post.content}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>
                                {post.createdAt 
                                  ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
                                  : 'Just now'}
                              </span>
                            </div>
                            {post.userId === currentUserId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deletePostMutation.mutate(post.id)}
                                className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                data-testid={`button-delete-post-${post.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-800">
          <Star className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Be the First to Share!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Share your results, celebrate wins, or express gratitude to inspire others on their journey.
          </p>
        </div>
      )}

      {/* View Archive Button */}
      <div className="flex justify-center mt-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setArchiveOpen(true)}
          className="gap-2"
          data-testid="button-view-archives"
        >
          <Archive className="w-4 h-4" />
          View Past Testimonials
        </Button>
      </div>

      <ArchivedTestimonialsModal open={archiveOpen} onOpenChange={setArchiveOpen} />
    </div>
  );
}
