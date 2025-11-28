import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { GratitudePost } from '@shared/schema';

interface ArchivedTestimonialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ArchiveResponse {
  posts: GratitudePost[];
  totalCount: number;
  page: number;
  limit: number;
}

export function ArchivedTestimonialsModal({ open, onOpenChange }: ArchivedTestimonialsModalProps) {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery<ArchiveResponse>({
    queryKey: ['/api/gratitude-posts/archived', page],
    enabled: open,
  });

  const posts = data?.posts || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / (data?.limit || 20));

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500',
      'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <DialogTitle>Archived Testimonials</DialogTitle>
          </div>
          <DialogDescription>
            Browse all shared gratitudes from the past (30+ days old). Total: {totalCount} posts
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-amber-300 border-t-amber-600 rounded-full" />
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {posts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-amber-200 dark:border-amber-800 hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Avatar className={`w-8 h-8 ${getAvatarColor(post.userName)}`}>
                            <AvatarFallback className="text-white font-semibold text-xs">
                              {getInitials(post.userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{post.userName}</span>
                              <Badge variant="outline" className="text-xs">
                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{post.content}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Archive className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No archived testimonials yet</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
