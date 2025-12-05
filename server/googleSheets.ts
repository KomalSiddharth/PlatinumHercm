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
  console.log('🚀🚀🚀 [CHUNK-BASED FETCH v3.0] Function called at:', new Date().toISOString());
  
  // Check cache
  if (cachedCourseTracking.length > 0 && Date.now() - courseTrackingCacheTimestamp < COURSE_TRACKING_CACHE_TTL) {
    console.log(`⚠️ [CACHE HIT] Returning ${cachedCourseTracking.length} cached courses`);
    return cachedCourseTracking;
  }
  
  console.log('🔄 [FRESH FETCH] Fetching course data using CHUNK METHOD to skip blank rows...');

  try {
    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    
    // Fetch data in multiple chunks to skip over empty rows
    // This ensures we don't miss courses separated by blank rows
    const CHUNK_SIZE = 500;
    const NUM_CHUNKS = 4; // Fetch up to row 2000
    
    const allRows: any[][] = [];
    
    for (let i = 0; i < NUM_CHUNKS; i++) {
      const startRow = i * CHUNK_SIZE + 1;
      const endRow = (i + 1) * CHUNK_SIZE;
      const range = `Sheet1!A${startRow}:B${endRow}`;
      
      try {
        // 🔥 CACHE-BUSTING: Add timestamp to force fresh data from Google Sheets API
        const cacheBuster = `cache-${Date.now()}`;
        
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
          quotaUser: cacheBuster, // Forces Google API to bypass server-side cache
        });
        
        const chunkRows = response.data.values || [];
        if (chunkRows.length > 0) {
          console.log(`📦 Chunk ${i + 1}: Fetched ${chunkRows.length} rows with cache-buster: ${cacheBuster} (${range})`);
          // Add rows to allRows, maintaining row index
          for (let j = 0; j < chunkRows.length; j++) {
            const actualRowIndex = startRow - 1 + j;
            allRows[actualRowIndex] = chunkRows[j];
          }
        }
      } catch (error) {
        console.log(`⏭️ Chunk ${i + 1}: No data or error, skipping (${range})`);
        // Continue to next chunk even if this one fails
      }
    }
    
    // Filter out undefined entries (empty rows)
    const rows = allRows.filter(row => row !== undefined);
    
    if (rows.length === 0) {
      console.warn('No data found in course tracking sheet');
      return [];
    }
    
    console.log(`📊 Fetched ${rows.length} rows from Google Sheet`);
    console.log(`🔍 DEBUG: Last 5 rows from API response:`);
    const lastRows = rows.slice(-5);
    lastRows.forEach((row, idx) => {
      const actualIndex = rows.length - 5 + idx;
      console.log(`   Row ${actualIndex + 1}: Column A = "${row[0] || ''}", Column B = "${row[1] || ''}"`);
    });

    const courses: CourseTrackingData[] = [];
    let currentCourse: CourseTrackingData | null = null;
    let lessonCounter: number = 0;

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
      If Column B (Answer) has a URL = it's a LESSON
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

    // REMOVED ALL NESTING LOGIC: All courses now display as top-level courses
    // No subcategories or sub-sub-categories - completely flat structure
    
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
