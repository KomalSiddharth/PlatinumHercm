import { storage } from './storage';
import type { RatingProgression } from '@shared/schema';

interface RatingUpdate {
  category: 'health' | 'relationship' | 'career' | 'money';
  newRating: number;
}

interface RatingValidationResult {
  cappedRating: number;
  maxAllowed: number;
  weeksAtMax: number;
  canIncrement: boolean;
}

// Map category to field names
const categoryFieldMap = {
  health: {
    maxRating: 'healthMaxRating' as const,
    weeksAtMax: 'healthWeeksAtMax' as const,
    lastRating: 'healthLastRating' as const,
    lastCountedWeek: 'healthLastCountedWeek' as const,
  },
  relationship: {
    maxRating: 'relationshipMaxRating' as const,
    weeksAtMax: 'relationshipWeeksAtMax' as const,
    lastRating: 'relationshipLastRating' as const,
    lastCountedWeek: 'relationshipLastCountedWeek' as const,
  },
  career: {
    maxRating: 'careerMaxRating' as const,
    weeksAtMax: 'careerWeeksAtMax' as const,
    lastRating: 'careerLastRating' as const,
    lastCountedWeek: 'careerLastCountedWeek' as const,
  },
  money: {
    maxRating: 'moneyMaxRating' as const,
    weeksAtMax: 'moneyWeeksAtMax' as const,
    lastRating: 'moneyLastRating' as const,
    lastCountedWeek: 'moneyLastCountedWeek' as const,
  },
};

export async function validateAndCapRating(
  userId: string,
  category: 'health' | 'relationship' | 'career' | 'money',
  newRating: number
): Promise<RatingValidationResult> {
  // Get or create rating progression for user
  let progression = await storage.getRatingProgression(userId);
  
  if (!progression) {
    // Initialize with defaults (max 7 for all categories)
    progression = await storage.upsertRatingProgression(userId, {
      userId,
    });
  }

  const fields = categoryFieldMap[category];
  const maxAllowed = progression[fields.maxRating];
  const lastRating = progression[fields.lastRating];
  const weeksAtMax = progression[fields.weeksAtMax];

  // Cap the rating at max allowed
  const cappedRating = Math.min(newRating, maxAllowed);

  // Check if rating equals max allowed
  const isAtMax = cappedRating === maxAllowed;
  const canIncrement = weeksAtMax >= 4 && isAtMax;

  return {
    cappedRating,
    maxAllowed,
    weeksAtMax,
    canIncrement,
  };
}

export async function updateRatingProgression(
  userId: string,
  category: 'health' | 'relationship' | 'career' | 'money',
  actualRating: number,
  weekNumber: number
): Promise<void> {
  let progression = await storage.getRatingProgression(userId);
  
  if (!progression) {
    progression = await storage.upsertRatingProgression(userId, {
      userId,
    });
  }

  const fields = categoryFieldMap[category];
  const maxAllowed = progression[fields.maxRating];
  const lastRating = progression[fields.lastRating];
  const currentWeeksAtMax = progression[fields.weeksAtMax];
  const lastCountedWeek = progression[fields.lastCountedWeek];

  // Only count progression if this is a strictly later week than last counted
  // This prevents replaying the same week or editing historical weeks from manipulating progression
  if (weekNumber <= lastCountedWeek) {
    // Ignore this save - it's a replay or historical edit
    return;
  }

  // Check if user achieved max rating
  if (actualRating === maxAllowed) {
    // Check if this is consistent with last week (consecutive weeks at max)
    if (lastRating === maxAllowed && lastCountedWeek === weekNumber - 1) {
      // Increment weeks at max (consecutive)
      const newWeeksAtMax = currentWeeksAtMax + 1;
      
      // Check if we should increment max rating (after 4 consecutive weeks)
      // HARD CAP: Max rating can never exceed 8 (no 9 or 10 allowed)
      if (newWeeksAtMax >= 4 && maxAllowed < 8) {
        // Increment max rating by 1 (capped at 8) and reset weeks counter
        await storage.updateRatingProgression(userId, {
          [fields.maxRating]: Math.min(maxAllowed + 1, 8),
          [fields.weeksAtMax]: 0,
          [fields.lastRating]: actualRating,
          [fields.lastCountedWeek]: weekNumber,
        });
      } else {
        // Just increment weeks counter (only if not already at max cap of 8)
        // If already at 8, no point tracking consecutive weeks
        await storage.updateRatingProgression(userId, {
          [fields.weeksAtMax]: maxAllowed < 8 ? newWeeksAtMax : 0,
          [fields.lastRating]: actualRating,
          [fields.lastCountedWeek]: weekNumber,
        });
      }
    } else {
      // First week at max OR broke the consecutive streak, start counting from 1
      // If already at max cap of 8, no point tracking consecutive weeks
      await storage.updateRatingProgression(userId, {
        [fields.weeksAtMax]: maxAllowed < 8 ? 1 : 0,
        [fields.lastRating]: actualRating,
        [fields.lastCountedWeek]: weekNumber,
      });
    }
  } else {
    // Not at max, reset counter
    await storage.updateRatingProgression(userId, {
      [fields.weeksAtMax]: 0,
      [fields.lastRating]: actualRating,
      [fields.lastCountedWeek]: weekNumber,
    });
  }
}

export async function getRatingCaps(userId: string): Promise<{
  health: number;
  relationship: number;
  career: number;
  money: number;
}> {
  let progression = await storage.getRatingProgression(userId);
  
  if (!progression) {
    progression = await storage.upsertRatingProgression(userId, {
      userId,
    });
  }

  return {
    health: progression.healthMaxRating,
    relationship: progression.relationshipMaxRating,
    career: progression.careerMaxRating,
    money: progression.moneyMaxRating,
  };
}

export async function getRatingProgressionStatus(userId: string): Promise<RatingProgression | undefined> {
  return await storage.getRatingProgression(userId);
}
