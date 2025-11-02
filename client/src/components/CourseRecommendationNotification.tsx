import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!lastMessage) return;

    console.log('[CourseRecommendation] Received WebSocket message:', lastMessage);

    // Handle new course recommendation
    if (lastMessage.type === 'course_recommended') {
      console.log('[CourseRecommendation] New recommendation received, playing sound');
      playNotificationSound();
      setRecommendation(lastMessage.data.recommendation);
      setShowDialog(true);
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

      // Update recommendation status to accepted
      // Note: Assignment is already created by backend when admin recommended
      // We just need to update the status, not create a duplicate assignment
      await apiRequest('PUT', `/api/admin/recommendation/${recommendation.id}/status`, {
        status: 'accepted',
      });

      toast({
        title: "Course Accepted ✓",
        description: `${recommendation.courseName} added to your assignments.`,
      });

      // Refresh data to show updated status
      queryClient.invalidateQueries({ queryKey: ['/api/persistent-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });

      setShowDialog(false);
      setRecommendation(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept recommendation.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    try {
      if (!recommendation) return;

      // Update recommendation status to rejected (DON'T DELETE - keep permanently)
      await apiRequest('PUT', `/api/admin/recommendation/${recommendation.id}/status`, {
        status: 'rejected',
      });

      toast({
        title: "Course Rejected",
        description: `You rejected ${recommendation.courseName}.`,
      });

      // Refresh recommendations
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });

      setShowDialog(false);
      setRecommendation(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject recommendation.",
        variant: "destructive",
      });
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
