import { useEffect, useState, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

interface CourseRecommendationNotificationProps {
  userId: string | undefined;
}

// Play notification sound using simple Audio (more reliable than Web Audio API)
function playNotificationSound() {
  try {
    // Create a simple beep sound using data URI
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Resume audio context (needed for autoplay policy)
    audioContext.resume().then(() => {
      // Create oscillator for first beep
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      
      oscillator1.type = 'sine';
      oscillator1.frequency.value = 800;
      gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.15);
      
      // Create oscillator for second beep
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 600;
      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.2);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      oscillator2.start(audioContext.currentTime + 0.2);
      oscillator2.stop(audioContext.currentTime + 0.35);
      
      console.log('[Notification] Sound played successfully');
    }).catch(err => {
      console.warn('[Notification] Audio context resume failed:', err);
    });
  } catch (error) {
    console.error('[Notification] Error playing sound:', error);
  }
}

export function CourseRecommendationNotification({ userId }: CourseRecommendationNotificationProps) {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { lastMessage } = useWebSocket(userId);
  const { toast } = useToast();
  
  // Track which recommendation IDs have been shown to prevent duplicates
  const shownRecommendationIds = useRef<Set<string>>(new Set());

  // Fetch pending recommendations on mount and poll every 10 seconds
  const { data: pendingRecommendations = [] } = useQuery<any[]>({
    queryKey: ['/api/user/recommendations'],
    enabled: !!userId,
    refetchInterval: 10000, // Poll every 10 seconds
    staleTime: 0, // Always consider data stale for instant updates
  });

  // Show first pending recommendation if exists and hasn't been shown yet
  useEffect(() => {
    if (pendingRecommendations.length > 0 && !showDialog && !recommendation) {
      // Find first recommendation that hasn't been shown
      const unshownRecommendation = pendingRecommendations.find(
        rec => !shownRecommendationIds.current.has(rec.id)
      );
      
      if (unshownRecommendation) {
        console.log('[CourseRecommendation] Found new pending recommendation, showing:', unshownRecommendation);
        shownRecommendationIds.current.add(unshownRecommendation.id);
        playNotificationSound();
        setRecommendation(unshownRecommendation);
        setShowDialog(true);
      }
    }
  }, [pendingRecommendations, showDialog, recommendation]);

  useEffect(() => {
    if (!lastMessage) return;

    console.log('[CourseRecommendation] Received WebSocket message:', lastMessage);

    // Handle new course recommendation
    if (lastMessage.type === 'course_recommended') {
      const newRec = lastMessage.data.recommendation;
      
      // Only show if not already shown
      if (!shownRecommendationIds.current.has(newRec.id)) {
        console.log('[CourseRecommendation] New recommendation received via WebSocket, showing:', newRec);
        shownRecommendationIds.current.add(newRec.id);
        playNotificationSound();
        setRecommendation(newRec);
        setShowDialog(true);
        
        // Invalidate query to keep polling in sync
        queryClient.invalidateQueries({ queryKey: ['/api/user/recommendations'] });
      } else {
        console.log('[CourseRecommendation] Recommendation already shown, skipping:', newRec.id);
      }
    }

    // Handle course recommendation deletion
    if (lastMessage.type === 'course_recommendation_deleted') {
      console.log('[CourseRecommendation] Recommendation deleted, refreshing queries');
      toast({
        title: "Course Removed",
        description: lastMessage.data.message,
      });
      
      // Refresh ALL related queries
      queryClient.invalidateQueries({ queryKey: ['/api/persistent-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });
      
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['/api/persistent-assignments'] });
    }
  }, [lastMessage, toast]);

  const handleAccept = async () => {
    try {
      if (!recommendation) return;

      // OPTIMISTIC UPDATE: Immediately update cache
      queryClient.setQueryData(['/api/admin/recommendations'], (old: any) => {
        if (!old) return old;
        return old.map((rec: any) =>
          rec.id === recommendation.id ? { ...rec, status: 'accepted' } : rec
        );
      });

      // Use the USER endpoint to accept recommendation
      // This will update status to 'accepted' and add to assignment column
      await apiRequest(`/api/user/recommendations/${recommendation.id}/accept`, 'POST', {});

      toast({
        title: "Course Accepted ✓",
        description: `${recommendation.courseName} added to your assignments.`,
      });

      // Refresh data to confirm the update
      queryClient.invalidateQueries({ queryKey: ['/api/persistent-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/recommendations'] });

      setShowDialog(false);
      setRecommendation(null);
    } catch (error) {
      console.error('[Accept Error]', error);
      toast({
        title: "Error",
        description: "Failed to accept recommendation.",
        variant: "destructive",
      });
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });
    }
  };

  const handleReject = async () => {
    try {
      if (!recommendation) return;

      // OPTIMISTIC UPDATE: Immediately update cache
      queryClient.setQueryData(['/api/admin/recommendations'], (old: any) => {
        if (!old) return old;
        return old.map((rec: any) =>
          rec.id === recommendation.id ? { ...rec, status: 'rejected' } : rec
        );
      });

      // Use the USER endpoint to reject recommendation
      await apiRequest(`/api/user/recommendations/${recommendation.id}/reject`, 'POST', {});

      toast({
        title: "Course Rejected",
        description: `You rejected ${recommendation.courseName}.`,
      });

      // Refresh recommendations to confirm
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/recommendations'] });

      setShowDialog(false);
      setRecommendation(null);
    } catch (error) {
      console.error('[Reject Error]', error);
      toast({
        title: "Error",
        description: "Failed to reject recommendation.",
        variant: "destructive",
      });
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });
    }
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent data-testid="dialog-course-recommendation">
        <AlertDialogHeader>
          <AlertDialogTitle>🎯 New Course Recommended!</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {recommendation && (
              <>
                <p className="font-semibold text-foreground">{recommendation.courseName}</p>
                <p>Category: <span className="capitalize">{recommendation.hrcmArea}</span></p>
                {recommendation.reason && (
                  <p className="text-sm italic">Reason: {recommendation.reason}</p>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleReject} data-testid="button-reject-recommendation">
            Reject
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleAccept} data-testid="button-accept-recommendation">
            Accept & Add to Assignments
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
