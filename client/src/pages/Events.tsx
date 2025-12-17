import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Utility function to convert 24-hour format to 12-hour format with AM/PM
const formatTimeWith12Hour = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  let hour = parseInt(hours);
  const min = minutes;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${ampm}`;
};

// Sort events by date first, then by time
const sortEventsByDateTime = (events: any[]): any[] => {
  return [...events].sort((a, b) => {
    // First compare by startDate (YYYY-MM-DD format)
    const dateCompare = (a.startDate || '').localeCompare(b.startDate || '');
    if (dateCompare !== 0) return dateCompare;
    
    // If same date, compare by startTime (HH:MM format)
    return (a.startTime || '').localeCompare(b.startTime || '');
  });
};

export default function Events() {
  const [, navigate] = useLocation();
  
  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/events'],
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-background to-cyan-50 dark:from-teal-950/30 dark:via-background dark:to-cyan-950/30 p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="mb-6"
              data-testid="button-back-events"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Upcoming Events
            </h1>
            <p className="text-muted-foreground">Loading events...</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-background to-cyan-50 dark:from-teal-950/30 dark:via-background dark:to-cyan-950/30 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-6"
            data-testid="button-back-events"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Upcoming Events
          </h1>
          <p className="text-muted-foreground">Stay connected with all scheduled sessions and events</p>
        </div>

        {events.length === 0 ? (
          <Card className="border-2 border-dashed" style={{ borderColor: '#bc0000' }}>
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#bc000015' }}>
                <CalendarIcon className="w-8 h-8" style={{ color: '#bc0000' }} />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
              <p className="text-muted-foreground">Check back soon for upcoming events!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {sortEventsByDateTime(events).map((event: any) => (
              <Card 
                key={event.id} 
                className="overflow-hidden hover-elevate transition-all flex flex-col shadow-md" 
                data-testid={`event-page-card-${event.id}`}
              >
                {event.imageUrl && (
                  <img 
                    src={event.imageUrl} 
                    alt={event.title}
                    className="w-full h-40 object-cover"
                  />
                )}
                <CardContent className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg mb-3 line-clamp-2 text-black dark:text-white" data-testid={`event-page-title-${event.id}`}>
                    {event.title}
                  </h3>

                  <div className="flex flex-wrap gap-2 mb-4 flex-1">
                    <Badge 
                      style={{ backgroundColor: '#00008c', color: 'white' }}
                      className="text-xs py-1 px-2"
                      data-testid={`event-page-time-${event.id}`}
                    >
                      {formatTimeWith12Hour(event.startTime)} - {formatTimeWith12Hour(event.endTime)}
                    </Badge>
                    <Badge 
                      variant="outline"
                      data-testid={`event-page-scheduling-${event.id}`}
                      className="text-xs py-1 px-2"
                    >
                      {event.schedulingType === 'daily' ? 'Daily' : 
                       event.schedulingType === 'weekly' ? `Weekly: ${event.specificDays?.join(', ')}` :
                       `Specific Days: ${event.specificDays?.join(', ')}`}
                    </Badge>
                  </div>

                  {event.externalLink && (
                    <Button
                      className="w-full text-white font-semibold mt-auto"
                      style={{ backgroundColor: '#bc0000' }}
                      onClick={() => window.open(event.externalLink, '_blank')}
                      data-testid={`button-join-event-${event.id}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Join Event
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
