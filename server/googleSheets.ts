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
