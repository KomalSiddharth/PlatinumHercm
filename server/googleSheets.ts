// Google Sheets integration for course knowledge base
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }
  return accessToken;
}

async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Extract spreadsheet ID from URL
function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('Invalid Google Sheets URL');
  }
  return match[1];
}

export interface CourseSuggestion {
  category: string;
  belief: string;
  courseName: string;
  moduleNumber: string;
  description: string;
}

// Enhanced Course Data Structure
export interface EnhancedCourseData {
  courseName: string;
  link: string;
  hercmAreas: string[]; // Comma-separated in sheet
  keywords: string[]; // Comma-separated in sheet
  targetProblems: string[]; // Comma-separated in sheet
  targetFeelings: string[]; // Comma-separated in sheet
  beliefTargets: string[]; // Comma-separated in sheet
  actionSuggestions: string[]; // Comma-separated in sheet
  difficulty?: string;
  duration?: string;
}

// Cache for course data
let cachedCourses: EnhancedCourseData[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function fetchCourseData(sheetUrl: string): Promise<CourseSuggestion[]> {
  try {
    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    
    // Fetch data from the sheet (assuming data is in Sheet1, starting from row 2)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:E1000', // Adjust range as needed
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.warn('No data found in Google Sheet:', spreadsheetId);
    }
    
    return rows.map((row) => ({
      category: row[0] || '',
      belief: row[1] || '',
      courseName: row[2] || '',
      moduleNumber: row[3] || '',
      description: row[4] || '',
    }));
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw new Error(`Failed to fetch course data from Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// New: Fetch enhanced course recommendations
export async function fetchEnhancedCourseData(sheetUrl: string): Promise<EnhancedCourseData[]> {
  // Check cache
  if (cachedCourses.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedCourses;
  }

  try {
    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    
    // Expected columns: Course Name | Link | HERCM Areas | Keywords | Target Problems | Target Feelings | Belief Targets | Action Suggestions | Difficulty | Duration
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:J1000',
    });

    const rows = response.data.values || [];
    
    cachedCourses = rows.map((row) => ({
      courseName: row[0] || '',
      link: row[1] || '',
      hercmAreas: (row[2] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      keywords: (row[3] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      targetProblems: (row[4] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      targetFeelings: (row[5] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      beliefTargets: (row[6] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      actionSuggestions: (row[7] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      difficulty: row[8] || '',
      duration: row[9] || '',
    }));

    cacheTimestamp = Date.now();
    console.log(`Loaded ${cachedCourses.length} courses from Google Sheets`);
    
    return cachedCourses;
  } catch (error) {
    console.error('Error fetching enhanced course data:', error);
    throw new Error(`Failed to fetch course data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Find best matching course based on belief and category
export function findMatchingCourse(
  courses: CourseSuggestion[],
  category: string,
  currentBelief: string
): CourseSuggestion | null {
  // Filter by category first
  const categoryMatches = courses.filter(
    (c) => c.category.toLowerCase() === category.toLowerCase()
  );

  if (categoryMatches.length === 0) {
    return null;
  }

  // Find best match by belief similarity (simple keyword matching)
  const beliefKeywords = currentBelief.toLowerCase().split(' ');
  
  let bestMatch = categoryMatches[0];
  let bestScore = 0;

  categoryMatches.forEach((course) => {
    const courseBeliefKeywords = course.belief.toLowerCase().split(' ');
    let score = 0;

    beliefKeywords.forEach((keyword) => {
      if (courseBeliefKeywords.some(ck => ck.includes(keyword) || keyword.includes(ck))) {
        score++;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestMatch = course;
    }
  });

  return bestMatch;
}

// Enhanced: Find top matching courses based on comprehensive HERCM data
interface MatchingInput {
  category: string;
  problems: string;
  feelings: string;
  beliefs: string;
  actions: string;
}

interface ScoredCourse {
  course: EnhancedCourseData;
  score: number;
  matchReasons: string[];
}

export async function recommendCourses(
  sheetUrl: string,
  input: MatchingInput,
  topN: number = 3
): Promise<ScoredCourse[]> {
  const courses = await fetchEnhancedCourseData(sheetUrl);
  
  // Filter by HERCM area first
  const relevantCourses = courses.filter(course =>
    course.hercmAreas.some(area => area.toLowerCase() === input.category.toLowerCase())
  );

  if (relevantCourses.length === 0) {
    return [];
  }

  // Score each course
  const scoredCourses: ScoredCourse[] = relevantCourses.map(course => {
    let score = 0;
    const matchReasons: string[] = [];

    // Helper function for keyword matching
    const matchKeywords = (text: string, keywords: string[]): number => {
      const lowerText = text.toLowerCase();
      let matches = 0;
      keywords.forEach(keyword => {
        if (lowerText.includes(keyword.toLowerCase())) {
          matches++;
        }
      });
      return matches;
    };

    // 1. Match Problems (Weight: 3)
    const problemMatches = matchKeywords(input.problems, course.targetProblems);
    if (problemMatches > 0) {
      score += problemMatches * 3;
      matchReasons.push(`Addresses ${problemMatches} of your problems`);
    }

    // 2. Match Feelings (Weight: 2)
    const feelingMatches = matchKeywords(input.feelings, course.targetFeelings);
    if (feelingMatches > 0) {
      score += feelingMatches * 2;
      matchReasons.push(`Targets ${feelingMatches} of your feelings`);
    }

    // 3. Match Beliefs (Weight: 3)
    const beliefMatches = matchKeywords(input.beliefs, course.beliefTargets);
    if (beliefMatches > 0) {
      score += beliefMatches * 3;
      matchReasons.push(`Transforms ${beliefMatches} limiting beliefs`);
    }

    // 4. Match Actions (Weight: 2)
    const actionMatches = matchKeywords(input.actions, course.actionSuggestions);
    if (actionMatches > 0) {
      score += actionMatches * 2;
      matchReasons.push(`Suggests ${actionMatches} aligned actions`);
    }

    // 5. General keyword match (Weight: 1)
    const keywordMatches = matchKeywords(
      `${input.problems} ${input.feelings} ${input.beliefs} ${input.actions}`,
      course.keywords
    );
    if (keywordMatches > 0) {
      score += keywordMatches;
      matchReasons.push(`${keywordMatches} keyword matches`);
    }

    return { course, score, matchReasons };
  });

  // Sort by score and return top N
  return scoredCourses
    .filter(sc => sc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

// Course Tracking Data Structures
export interface CourseLesson {
  id: string;
  title: string;
  url: string;
  completed: boolean;
}

export interface CourseSubcategory {
  id: string;
  title: string;
  lessons: CourseLesson[];
  subcategories?: CourseSubcategory[]; // Support nested subcategories
}

export interface CourseTrackingData {
  id: string;
  title: string;
  url: string;
  tags: string[];
  source: string;
  estimatedHours: number;
  status: string;
  progressPercent: number;
  category: string;
  lessons: CourseLesson[];
  subcategories?: CourseSubcategory[];
}

// Cache for course tracking data
let cachedCourseTracking: CourseTrackingData[] = [];
let courseTrackingCacheTimestamp = 0;
const COURSE_TRACKING_CACHE_TTL = 0; // DISABLED - Force fresh data every time for sorting fix

// Fetch course tracking data from Google Sheet
// Format: Question column = Lesson name, Answer column = Lesson URL
// Bold rows or rows with empty Answer = Course headings
// Helper function to clear course tracking cache
export function clearCourseTrackingCache() {
  cachedCourseTracking = [];
  courseTrackingCacheTimestamp = 0;
  console.log('🧹 Course tracking cache cleared');
}

export async function fetchCourseTrackingData(sheetUrl: string): Promise<CourseTrackingData[]> {
  // Check cache
  if (cachedCourseTracking.length > 0 && Date.now() - courseTrackingCacheTimestamp < COURSE_TRACKING_CACHE_TTL) {
    console.log(`Returning ${cachedCourseTracking.length} cached courses`);
    return cachedCourseTracking;
  }
  
  console.log('🔄 Fetching fresh course data from Google Sheets (simple method)...');

  try {
    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    
    // Use simple values.get (no formatting needed)
    // Rows with empty Column B = Course headings
    // Rows with non-empty Column B = Lessons
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A1:B2000',
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.warn('No data found in course tracking sheet');
      return [];
    }
    
    console.log(`📊 Fetched ${rows.length} rows from Google Sheet`);

    const courses: CourseTrackingData[] = [];
    let currentCourse: CourseTrackingData | null = null;
    let lessonCounter = 0;

    // FIRST PASS: Parse all courses normally (including Health Mastery as a regular course)
    rows.forEach((row, index) => {
      const question = (row[0] || '').toString().trim();
      const answer = (row[1] || '').toString().trim();

      // Skip header row
      if (index === 0 && question.toLowerCase().includes('question')) {
        console.log(`⏭️ Skipping header row: "${question}"`);
        return;
      }

      // Skip empty rows
      if (!question) {
        return;
      }

      // If Column B (Answer) is EMPTY = it's a COURSE heading
      if (!answer) {
        // Save previous course if exists
        if (currentCourse !== null) {
          courses.push(currentCourse);
          console.log(`✅ Saved course "${currentCourse.title}" with ${currentCourse.lessons.length} lessons`);
        }

        // Create new course
        const courseId = question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        currentCourse = {
          id: courseId,
          title: question,
          url: '#',
          tags: [],
          source: 'Mitesh Khatri',
          estimatedHours: 10,
          status: 'not_started',
          progressPercent: 0,
          category: 'default',
          lessons: [],
        };
        lessonCounter = 0;
        console.log(`🎓 NEW COURSE (empty URL): "${question}" at row ${index + 1}`);
      } 
      // If Column B (Answer) has a URL = it's a LESSON
      else if (answer) {
        if (currentCourse !== null) {
          lessonCounter++;
          const lessonId = `${currentCourse.id}-${lessonCounter}`;
          currentCourse.lessons.push({
            id: lessonId,
            title: question,
            url: answer,
            completed: false,
          });
          console.log(`  📝 Lesson ${lessonCounter}: "${question.substring(0, 40)}..." → ${answer.substring(0, 30)}...`);
        }
      }
    });
    
    // Add last course if exists
    if (currentCourse !== null) {
      courses.push(currentCourse);
      console.log(`✅ Saved final course "${currentCourse.title}" with ${currentCourse.lessons.length} lessons`);
    }

    // SECOND PASS: Move Mastery courses as subcategories under Platinum Fast Track
    const platinumFastTrackIndex = courses.findIndex(c => 
      c.title.toLowerCase().includes('platinum') && c.title.toLowerCase().includes('fast track')
    );
    
    if (platinumFastTrackIndex !== -1) {
      const platinumCourse = courses[platinumFastTrackIndex];
      
      // Initialize subcategories array
      if (!platinumCourse.subcategories) {
        platinumCourse.subcategories = [];
      }
      
      // List of mastery courses to move as subcategories
      const masteryCourses = [
        'health mastery',
        'relationship mastery',
        'career mastery',
        'wealth mastery'
      ];
      
      // Move each mastery course as subcategory
      masteryCourses.forEach(masteryName => {
        const masteryIndex = courses.findIndex(c => 
          c.title.toLowerCase().includes(masteryName)
        );
        if (masteryIndex !== -1) {
          const masteryCourse = courses[masteryIndex];
          platinumCourse.subcategories.push({
            id: masteryCourse.id,
            title: masteryCourse.title,
            lessons: masteryCourse.lessons,
            subcategories: [],  // Initialize for potential sub-sub-courses
          });
          courses.splice(masteryIndex, 1);
          console.log(`🔸 Moved "${masteryCourse.title}" (${masteryCourse.lessons.length} lessons) as subcategory under "Platinum Fast Track"`);
        }
      });
      
      // THIRD PASS: Move sub-sub-courses under mastery subcategories
      
      // Move "Relationship Mastery with Mitesh Khatri" under "Relationship Mastery"
      const relationshipMasterySubcat = platinumCourse.subcategories?.find(sc => 
        sc.title.toLowerCase().includes('relationship mastery') && 
        !sc.title.toLowerCase().includes('mitesh khatri')
      );
      
      if (relationshipMasterySubcat) {
        const miteshCourseIndex = courses.findIndex(c => 
          c.title.toLowerCase().includes('relationship mastery') && 
          c.title.toLowerCase().includes('mitesh khatri')
        );
        
        if (miteshCourseIndex !== -1) {
          const miteshCourse = courses[miteshCourseIndex];
          
          if (!relationshipMasterySubcat.subcategories) {
            relationshipMasterySubcat.subcategories = [];
          }
          
          relationshipMasterySubcat.subcategories.push({
            id: miteshCourse.id,
            title: miteshCourse.title,
            lessons: miteshCourse.lessons,
          });
          courses.splice(miteshCourseIndex, 1);
          console.log(`🔹 Moved "${miteshCourse.title}" (${miteshCourse.lessons.length} lessons) as sub-sub-course under "Relationship Mastery"`);
        }
      }
      
      // Move "Morning Happy Gym Dance Videos" under "Health Mastery"
      const healthMasterySubcat = platinumCourse.subcategories?.find(sc => 
        sc.title.toLowerCase().includes('health mastery') && 
        !sc.title.toLowerCase().includes('morning') &&
        !sc.title.toLowerCase().includes('gym') &&
        !sc.title.toLowerCase().includes('dance')
      );
      
      if (healthMasterySubcat) {
        const gymDanceCourseIndex = courses.findIndex(c => 
          c.title.toLowerCase().includes('morning') && 
          c.title.toLowerCase().includes('gym') &&
          c.title.toLowerCase().includes('dance')
        );
        
        if (gymDanceCourseIndex !== -1) {
          const gymDanceCourse = courses[gymDanceCourseIndex];
          
          if (!healthMasterySubcat.subcategories) {
            healthMasterySubcat.subcategories = [];
          }
          
          healthMasterySubcat.subcategories.push({
            id: gymDanceCourse.id,
            title: gymDanceCourse.title,
            lessons: gymDanceCourse.lessons,
          });
          courses.splice(gymDanceCourseIndex, 1);
          console.log(`🔹 Moved "${gymDanceCourse.title}" (${gymDanceCourse.lessons.length} lessons) as sub-sub-course under "Health Mastery"`);
        }
      }
      
      // Move Career Mastery sub-sub-courses
      const careerMasterySubcat = platinumCourse.subcategories?.find(sc => 
        sc.title.toLowerCase().includes('career mastery')
      );
      
      if (careerMasterySubcat) {
        if (!careerMasterySubcat.subcategories) {
          careerMasterySubcat.subcategories = [];
        }
        
        // List of Career Mastery sub-sub-courses to move
        const careerSubCourses = [
          { keywords: ["investing", "saving"], name: "Investing and Saving" },
          { keywords: ["canva", "graphic", "design"], name: "Canva Graphic Design Mastery" },
          { keywords: ["ai"], name: "AI Course" },
          { keywords: ["corporate", "train", "trainer", "mitesh"], name: "Corporate Train the Trainer by Mitesh Khatri" }
        ];
        
        careerSubCourses.forEach(({ keywords, name }) => {
          const subCourseIndex = courses.findIndex(c => {
            const lowerTitle = c.title.toLowerCase();
            return keywords.every(keyword => lowerTitle.includes(keyword.toLowerCase()));
          });
          
          if (subCourseIndex !== -1) {
            const subCourse = courses[subCourseIndex];
            careerMasterySubcat.subcategories!.push({
              id: subCourse.id,
              title: subCourse.title,
              lessons: subCourse.lessons,
            });
            courses.splice(subCourseIndex, 1);
            console.log(`🔹 Moved "${subCourse.title}" (${subCourse.lessons.length} lessons) as sub-sub-course under "Career Mastery"`);
          }
        });
      }
    }
    
    // FOURTH PASS: Move DMP-related courses as sub-sub-courses under "DMP - Daily Magic Practice Recordings"
    const dmpCourseIndex = courses.findIndex(c => 
      c.title.toLowerCase().includes('dmp') && 
      c.title.toLowerCase().includes('daily magic practice') &&
      c.title.toLowerCase().includes('recordings')
    );
    
    if (dmpCourseIndex !== -1) {
      const dmpCourse = courses[dmpCourseIndex];
      
      if (!dmpCourse.subcategories) {
        dmpCourse.subcategories = [];
      }
      
      // List of DMP sub-courses to move
      const dmpSubCourses = [
        { keywords: ["june'25", "dmp", "recordings"], name: "June'25 DMP recordings" },
        { keywords: ["20th june", "master at relationship"], name: "20th June - Master at Relationship" },
        { keywords: ["22nd mar", "hopeful"], name: "22nd Mar - I Am Hopeful" },
        { keywords: ["8th oct", "nothing is working", "universe"], name: "8th Oct - Universe is Working" }
      ];
      
      dmpSubCourses.forEach(({ keywords, name }) => {
        const subCourseIndex = courses.findIndex(c => {
          const lowerTitle = c.title.toLowerCase();
          return keywords.every(keyword => lowerTitle.includes(keyword.toLowerCase()));
        });
        
        if (subCourseIndex !== -1) {
          const subCourse = courses[subCourseIndex];
          dmpCourse.subcategories!.push({
            id: subCourse.id,
            title: subCourse.title,
            lessons: subCourse.lessons,
          });
          courses.splice(subCourseIndex, 1);
          console.log(`🔹 Moved "${subCourse.title}" (${subCourse.lessons.length} lessons) as sub-sub-course under "DMP - Daily Magic Practice Recordings"`);
        }
      });
    }
    
    // FIFTH PASS: Move Platinum Weekly Call related courses as sub-sub-courses under "Platinum Weekly Call"
    const platinumWeeklyCallIndex = courses.findIndex(c => 
      c.title.toLowerCase().includes('platinum') && 
      c.title.toLowerCase().includes('weekly') &&
      c.title.toLowerCase().includes('call') &&
      !c.title.toLowerCase().includes('bonus') &&
      !c.title.toLowerCase().includes('healing')
    );
    
    if (platinumWeeklyCallIndex !== -1) {
      const platinumWeeklyCall = courses[platinumWeeklyCallIndex];
      
      if (!platinumWeeklyCall.subcategories) {
        platinumWeeklyCall.subcategories = [];
      }
      
      // List of Platinum Weekly Call sub-courses to move
      const platinumWeeklySubCourses = [
        { keywords: ["aug", "2025", "platinum", "bonus", "call", "recording"], name: "Aug 2025 Platinum Bonus Call Recording" },
        { keywords: ["sept", "25", "platinum", "bonus", "call", "recording"], name: "Sept'25 Platinum Bonus Call Recording" },
        { keywords: ["platinum", "healing", "sessions"], name: "Platinum Healing Sessions" }
      ];
      
      platinumWeeklySubCourses.forEach(({ keywords, name }) => {
        const subCourseIndex = courses.findIndex(c => {
          const lowerTitle = c.title.toLowerCase();
          return keywords.every(keyword => lowerTitle.includes(keyword.toLowerCase()));
        });
        
        if (subCourseIndex !== -1) {
          const subCourse = courses[subCourseIndex];
          platinumWeeklyCall.subcategories!.push({
            id: subCourse.id,
            title: subCourse.title,
            lessons: subCourse.lessons,
          });
          courses.splice(subCourseIndex, 1);
          console.log(`🔹 Moved "${subCourse.title}" (${subCourse.lessons.length} lessons) as sub-sub-course under "Platinum Weekly Call"`);
        }
      });
    }

    // FILTER OUT: Remove "Final Q&A" course
    const finalQACourseIndex = courses.findIndex(c => 
      c.title.toLowerCase().includes('final') && 
      (c.title.toLowerCase().includes('q&a') || 
       c.title.toLowerCase().includes('q & a') ||
       c.title.toLowerCase().includes('qa'))
    );
    
    if (finalQACourseIndex !== -1) {
      const removedCourse = courses[finalQACourseIndex];
      courses.splice(finalQACourseIndex, 1);
      console.log(`🚫 Removed "${removedCourse.title}" from course list`);
    }

    console.log(`\n🎉 Total courses parsed: ${courses.length}`);
    courses.forEach((course, idx) => {
      console.log(`   ${idx + 1}. "${course.title}" - ${course.lessons.length} lessons`);
    });

    // Cache the results
    cachedCourseTracking = courses;
    courseTrackingCacheTimestamp = Date.now();

    return courses;
  } catch (error) {
    console.error('❌ Error fetching course tracking data:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw error;
  }
}
