// Google Sheets integration for course knowledge base
import { google } from 'googleapis';

let connectionSettings: any;

// 🔥 NEW: Service Account authentication for Railway
async function getGoogleSheetsClient() {
  // Check if running on Railway (use Service Account)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.log('🚀 Using Service Account authentication');
    
    try {
      // Parse the JSON key from environment variable
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      
      const authClient = await auth.getClient();
      return google.sheets({ version: 'v4', auth: authClient });
    } catch (error) {
      console.error('❌ Service Account authentication failed:', error);
      throw new Error('Failed to authenticate with Google Service Account');
    }
  }
  
  // Fallback to Replit Connectors (for local development)
  console.log('🔄 Using Replit Connectors authentication');
  return await getUncachableGoogleSheetClient();
}

// Original Replit Connectors authentication (keep for local dev)
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
  hercmAreas: string[];
  keywords: string[];
  targetProblems: string[];
  targetFeelings: string[];
  beliefTargets: string[];
  actionSuggestions: string[];
  difficulty?: string;
  duration?: string;
}

// Cache for course data
let cachedCourses: EnhancedCourseData[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

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
  subcategories?: CourseSubcategory[];
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

let cachedCourseTracking: CourseTrackingData[] = [];
let courseTrackingCacheTimestamp = 0;

export function clearCourseTrackingCache() {
  console.log('🗑️ Clearing course tracking cache');
  cachedCourseTracking = [];
  courseTrackingCacheTimestamp = 0;
}

export function getCoursesCacheData(): CourseTrackingData[] | null {
  const now = Date.now();
  const cacheAge = now - courseTrackingCacheTimestamp;
  
  if (cachedCourseTracking.length > 0 && cacheAge < 30000) {
    console.log(`✅ Using fresh cache (${Math.floor(cacheAge / 1000)}s old)`);
    return cachedCourseTracking;
  }
  
  return null;
}

export function setCoursesCacheData(courses: CourseTrackingData[]) {
  cachedCourseTracking = courses;
  courseTrackingCacheTimestamp = Date.now();
  console.log(`💾 Cached ${courses.length} courses`);
}

// 🔥 UPDATED: fetchCourseTrackingData now uses new authentication
export async function fetchCourseTrackingData(sheetUrl: string): Promise<CourseTrackingData[]> {
  try {
    // 🚀 Use new authentication method
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    
    console.log(`📊 Fetching course data from: ${spreadsheetId}`);
    
    const CHUNK_SIZE = 1000;
    const NUM_CHUNKS = 10;
    const allRows: any[][] = [];
    
    for (let i = 0; i < NUM_CHUNKS; i++) {
      const startRow = i * CHUNK_SIZE + 1;
      const endRow = (i + 1) * CHUNK_SIZE;
      const range = `Sheet1!A${startRow}:B${endRow}`;
      
      try {
        const cacheBuster = `cache-${Date.now()}`;
        
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
          quotaUser: cacheBuster,
        });
        
        const chunkRows = response.data.values || [];
        if (chunkRows.length > 0) {
          console.log(`📦 Chunk ${i + 1}: Fetched ${chunkRows.length} rows`);
          for (let j = 0; j < chunkRows.length; j++) {
            const actualRowIndex = startRow - 1 + j;
            allRows[actualRowIndex] = chunkRows[j];
          }
        }
      } catch (error) {
        console.log(`⏭️ Chunk ${i + 1}: No data, skipping`);
      }
    }
    
    const rows = allRows.filter(row => row !== undefined);
    
    if (rows.length === 0) {
      console.warn('No data found in course tracking sheet');
      return [];
    }
    
    console.log(`📊 Total rows fetched: ${rows.length}`);
    
    // Parse rows into course structure
    const courses: CourseTrackingData[] = [];
    let currentCourse: CourseTrackingData | null = null;
    let lessonCounter = 0;
    
    rows.forEach((row, index) => {
      const question = (row[0] || '').trim();
      const answer = (row[1] || '').trim();
      
      if (!question) return;
      
      // Detect course title (no answer, not starting with number)
      if (!answer && !/^\d/.test(question)) {
        if (currentCourse !== null) {
          courses.push(currentCourse);
          console.log(`✅ Saved course "${currentCourse.title}" with ${currentCourse.lessons.length} lessons`);
        }
        
        currentCourse = {
          id: question.replace(/\s+/g, '-').toLowerCase(),
          title: question,
          url: '',
          tags: [],
          source: 'Google Sheet',
          estimatedHours: 0,
          status: 'not_started',
          progressPercent: 0,
          category: 'General',
          lessons: [],
        };
        lessonCounter = 0;
        console.log(`\n🎓 New course detected: "${question}"`);
      }
      // Detect lesson (has answer URL)
      else if (answer && currentCourse !== null) {
        lessonCounter++;
        const lessonId = `${currentCourse.id}-${lessonCounter}`;
        currentCourse.lessons.push({
          id: lessonId,
          title: question,
          url: answer,
          completed: false,
        });
        console.log(`  📝 Lesson ${lessonCounter}: "${question.substring(0, 40)}..."`);
      }
    });
    
    // Add last course
    if (currentCourse !== null) {
      courses.push(currentCourse);
      console.log(`✅ Saved final course "${currentCourse.title}" with ${currentCourse.lessons.length} lessons`);
    }
    
    // Remove "Final Q&A" course
    const finalQACourseIndex = courses.findIndex(c => 
      c.title.toLowerCase().includes('final') && 
      (c.title.toLowerCase().includes('q&a') || c.title.toLowerCase().includes('qa'))
    );
    
    if (finalQACourseIndex !== -1) {
      const removedCourse = courses[finalQACourseIndex];
      courses.splice(finalQACourseIndex, 1);
      console.log(`🚫 Removed "${removedCourse.title}" from course list`);
    }
    
    console.log(`\n🎉 Total courses parsed: ${courses.length}`);
    
    // Cache the results
    setCoursesCacheData(courses);
    
    return courses;
  } catch (error) {
    console.error('❌ Error fetching course tracking data:', error);
    throw error;
  }
}

export async function fetchCourseData(sheetUrl: string): Promise<CourseSuggestion[]> {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:E1000',
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
    throw new Error(`Failed to fetch course data from Google Sheets`);
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

export async function fetchEnhancedCourseData(sheetUrl: string): Promise<EnhancedCourseData[]> {
  const now = Date.now();
  if (cachedCourses.length > 0 && (now - cacheTimestamp) < CACHE_TTL) {
    console.log('Using cached enhanced course data');
    return cachedCourses;
  }

  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'EnhancedCourses!A2:J1000',
    });

    const rows = response.data.values || [];
    
    const courses: EnhancedCourseData[] = rows.map((row) => ({
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

    cachedCourses = courses;
    cacheTimestamp = now;
    
    return courses;
  } catch (error) {
    console.error('Error fetching enhanced course data:', error);
    if (cachedCourses.length > 0) {
      console.log('Returning stale cache due to error');
      return cachedCourses;
    }
    throw error;
  }
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

  // Score each course
  const scoredCourses: ScoredCourse[] = relevantCourses.map(course => {
    let score = 0;
    const matchReasons: string[] = [];

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
