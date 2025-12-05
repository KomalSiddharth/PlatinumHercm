// server/googleSheets.ts
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

function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('Invalid Google Sheets URL');
  }
  return match[1];
}

export interface CourseLesson {
  id: string;
  title: string;
  url: string;
  completed: boolean;
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
  subcategories?: any[];
}

let cachedCourseTracking: CourseTrackingData[] = [];
let courseTrackingCacheTimestamp = 0;
const COURSE_TRACKING_CACHE_TTL = 0; // 0 = always fresh (adjust if needed)

export function clearCourseTrackingCache() {
  cachedCourseTracking = [];
  courseTrackingCacheTimestamp = 0;
  console.log('🧹 Course tracking cache cleared');
}

export async function fetchCourseTrackingData(sheetUrl: string): Promise<CourseTrackingData[]> {
  console.log('🚀 [fetchCourseTrackingData] called at', new Date().toISOString());

  if (cachedCourseTracking.length > 0 && Date.now() - courseTrackingCacheTimestamp < COURSE_TRACKING_CACHE_TTL) {
    console.log('⚠️ Returning cached course tracking data');
    return cachedCourseTracking;
  }

  try {
    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheetId = extractSpreadsheetId(sheetUrl);

    const CHUNK_SIZE = 500;
    const NUM_CHUNKS = 4; // fetch up to rows 2000 (increase if needed)
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
        for (let j = 0; j < chunkRows.length; j++) {
          const actualRowIndex = startRow - 1 + j;
          allRows[actualRowIndex] = chunkRows[j];
        }
      } catch (err) {
        console.log(`Chunk ${i + 1} empty or failed (${range}), continuing`);
      }
    }

    const rows = allRows.filter(row => row !== undefined);
    if (rows.length === 0) {
      console.warn('No data found in course tracking sheet');
      return [];
    }

    const courses: CourseTrackingData[] = [];
    let currentCourse: CourseTrackingData | null = null;
    let lessonCounter = 0;

    rows.forEach((row, idx) => {
      const question = (row[0] || '').toString().trim();
      const answer = (row[1] || '').toString().trim();

      // If header row present, skip
      if (idx === 0 && question.toLowerCase().includes('question')) {
        return;
      }

      // skip empty rows
      if (!question) return;

      // If answer empty -> new course heading
      if (!answer) {
        if (currentCourse !== null) {
          courses.push(currentCourse);
        }
        const courseId = question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        currentCourse = {
          id: courseId,
          title: question,
          url: '#',
          tags: [],
          source: 'GoogleSheet',
          estimatedHours: 10,
          status: 'not_started',
          progressPercent: 0,
          category: 'default',
          lessons: []
        };
        lessonCounter = 0;
      } else {
        // If answer present -> lesson
        if (currentCourse !== null) {
          lessonCounter++;
          const lessonId = `${currentCourse.id}-${lessonCounter}`;
          currentCourse.lessons.push({
            id: lessonId,
            title: question,
            url: answer,
            completed: false
          });
        }
      }
    });

    if (currentCourse !== null) {
      courses.push(currentCourse);
    }

    // Remove "Final Q&A" course if found
    const finalQACourseIndex = courses.findIndex(c => {
      const t = c.title.toLowerCase();
      return t.includes('final') && (t.includes('q&a') || t.includes('q & a') || t.includes('qa'));
    });
    if (finalQACourseIndex !== -1) {
      const removed = courses.splice(finalQACourseIndex, 1);
      console.log('Removed Final Q&A course:', removed[0]?.title);
    }

    cachedCourseTracking = courses;
    courseTrackingCacheTimestamp = Date.now();
    console.log(`Parsed ${courses.length} courses`);
    return courses;
  } catch (error) {
    console.error('Error in fetchCourseTrackingData:', error);
    throw error;
  }
}
