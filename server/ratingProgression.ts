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
  },
  relationship: {
    maxRating: 'relationshipMaxRating' as const,
    weeksAtMax: 'relationshipWeeksAtMax' as const,
    lastRating: 'relationshipLastRating' as const,
  },
  career: {
    maxRating: 'careerMaxRating' as const,
    weeksAtMax: 'careerWeeksAtMax' as const,
    lastRating: 'careerLastRating' as const,
  },
  money: {
    maxRating: 'moneyMaxRating' as const,
    weeksAtMax: 'moneyWeeksAtMax' as const,
    lastRating: 'moneyLastRating' as const,
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
  actualRating: number
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

  // Check if user achieved max rating
  if (actualRating === maxAllowed) {
    // Check if this is consistent with last week
    if (lastRating === maxAllowed) {
      // Increment weeks at max
      const newWeeksAtMax = currentWeeksAtMax + 1;
      
      // Check if we should increment max rating (after 4 consecutive weeks)
      if (newWeeksAtMax >= 4) {
        // Increment max rating by 1 and reset weeks counter
        await storage.updateRatingProgression(userId, {
          [fields.maxRating]: maxAllowed + 1,
          [fields.weeksAtMax]: 0,
          [fields.lastRating]: actualRating,
        });
      } else {
        // Just increment weeks counter
        await storage.updateRatingProgression(userId, {
          [fields.weeksAtMax]: newWeeksAtMax,
          [fields.lastRating]: actualRating,
        });
      }
    } else {
      // First week at max, start counting
      await storage.updateRatingProgression(userId, {
        [fields.weeksAtMax]: 1,
        [fields.lastRating]: actualRating,
      });
    }
  } else {
    // Not at max, reset counter
    await storage.updateRatingProgression(userId, {
      [fields.weeksAtMax]: 0,
      [fields.lastRating]: actualRating,
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
