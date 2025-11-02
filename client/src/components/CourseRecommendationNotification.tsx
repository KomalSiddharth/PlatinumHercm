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

// Play notification sound using Web Audio API (no file needed)
function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 800; // High pitch notification
    gainNode.gain.value = 0.3; // 30% volume

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15); // 150ms beep

    // Second beep
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      
      osc2.type = 'sine';
      osc2.frequency.value = 600;
      gain2.gain.value = 0.3;
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.15);
    }, 100);

    oscillator.onended = () => {
      ctx.close();
    };
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

export function CourseRecommendationNotification({ userId }: CourseRecommendationNotificationProps) {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { lastMessage } = useWebSocket(userId);
  const { toast } = useToast();

  useEffect(() => {
    if (!lastMessage) return;

    // Handle new course recommendation
    if (lastMessage.type === 'course_recommended') {
      playNotificationSound();
      setRecommendation(lastMessage.data.recommendation);
      setShowDialog(true);
    }

    // Handle course recommendation deletion
    if (lastMessage.type === 'course_recommendation_deleted') {
      toast({
        title: "Course Removed",
        description: lastMessage.data.message,
      });
      
      // Refresh assignments and recommendations
      queryClient.invalidateQueries({ queryKey: ['/api/persistent-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recommendations'] });
    }
  }, [lastMessage, toast]);

  const handleAccept = async () => {
    try {
      if (!recommendation) return;

      // Add to persistent assignments
      await apiRequest('POST', '/api/persistent-assignments', {
        hrcmArea: recommendation.hrcmArea.toLowerCase(),
        courseId: recommendation.courseId,
        courseName: recommendation.courseName,
        lessonId: recommendation.lessonId,
        lessonName: recommendation.lessonName,
        url: recommendation.lessonUrl,
        source: 'admin_recommendation',
        recommendationId: recommendation.id,
      });

      // Update recommendation status to accepted
      await apiRequest('PUT', `/api/admin/recommendation/${recommendation.id}/status`, {
        status: 'accepted',
      });

      toast({
        title: "Course Added",
        description: `${recommendation.courseName} has been added to your assignments.`,
      });

      // Refresh data
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

      // Update recommendation status to rejected (but don't delete)
      await apiRequest('PUT', `/api/admin/recommendation/${recommendation.id}/status`, {
        status: 'rejected',
      });

      toast({
        title: "Recommendation Rejected",
        description: `You rejected ${recommendation.courseName}.`,
      });

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
