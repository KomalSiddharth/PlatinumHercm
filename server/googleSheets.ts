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
const COURSE_TRACKING_CACHE_TTL = 1 * 60 * 1000; // 1 minute (temporary for testing)

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
  
  console.log('🔄 Fetching fresh course data from Google Sheets...');

  try {
    const sheets = await getUncachableGoogleSheetClient();
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    
    // Fetch data from sheet (Question & Answer columns)
    // Using A1:B2000 to capture all rows (currently ~1383 rows)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A1:B2000',
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.warn('No data found in course tracking sheet');
      return [];
    }

    const courses: CourseTrackingData[] = [];
    let currentCourse: CourseTrackingData | null = null;
    let lessonCounter = 0;
    let currentSubcategory: CourseSubcategory | null = null;
    let subcategoryLessonCounter = 0;

    // Known subcategory names for Platinum Fast Track
    const platinumSubcategoryNames = [
      'career mastery',
      'relationship mastery',
      'wealth mastery',
      'health mastery'
    ];

    rows.forEach((row, index) => {
      const question = (row[0] || '').trim();
      const answer = (row[1] || '').trim();

      // Skip header row
      if (index === 0 && question.toLowerCase().includes('question')) {
        return;
      }

      // Skip empty rows
      if (!question) {
        return;
      }

      // Check if this is a Platinum Fast Track subcategory header
      const isPlatinumCourse = currentCourse && currentCourse.title.toLowerCase().includes('platinum') && currentCourse.title.toLowerCase().includes('fast');
      const isSubcategoryHeader = isPlatinumCourse && !answer && platinumSubcategoryNames.some(name => question.toLowerCase().includes(name));

      if (isSubcategoryHeader) {
        // Save previous subcategory if exists
        if (currentSubcategory !== null && currentCourse) {
          if (!currentCourse.subcategories) {
            currentCourse.subcategories = [];
          }
          currentCourse.subcategories.push(currentSubcategory);
          console.log(`📂 Saved subcategory "${currentSubcategory.title}" with ${currentSubcategory.lessons.length} lessons`);
        }

        // Create new subcategory
        const subcategoryId = question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        currentSubcategory = {
          id: subcategoryId,
          title: question,
          lessons: [],
        };
        subcategoryLessonCounter = 0;
        console.log(`🆕 Creating subcategory: "${question}" for Platinum Fast Track`);
        return;
      }

      // If Answer is empty or row looks like a course heading, it's a new course
      if (!answer || (!answer.startsWith('http') && currentCourse !== null && !isSubcategoryHeader)) {
        // Save last subcategory of previous course if exists
        if (currentSubcategory !== null && currentCourse) {
          if (!currentCourse.subcategories) {
            currentCourse.subcategories = [];
          }
          currentCourse.subcategories.push(currentSubcategory);
          console.log(`📂 Saved final subcategory "${currentSubcategory.title}" with ${currentSubcategory.lessons.length} lessons`);
          currentSubcategory = null;
        }

        // Save previous course if exists
        if (currentCourse !== null) {
          // Log course details before saving
          if (currentCourse.title.toLowerCase().includes('june') && currentCourse.title.toLowerCase().includes('dmp')) {
            console.log(`📝 Saving "June'25 DMP Recordings" course with ${currentCourse.lessons.length} lessons`);
          }
          courses.push(currentCourse);
        }

        // Create new course
        const courseId = question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        currentCourse = {
          id: courseId,
          title: question,
          url: answer || '#',
          tags: [],
          source: 'Mitesh Khatri',
          estimatedHours: 10,
          status: 'not_started',
          progressPercent: 0,
          category: 'default',
          lessons: [],
        };
        lessonCounter = 0;
        
        // Log when creating Platinum Fast Track or June DMP course
        if (question.toLowerCase().includes('platinum') && question.toLowerCase().includes('fast')) {
          console.log(`🆕 Creating Platinum Fast Track course: "${question}" at row ${index + 1}`);
        } else if (question.toLowerCase().includes('june') && question.toLowerCase().includes('dmp')) {
          console.log(`🆕 Creating course: "${question}" at row ${index + 1}`);
        }
      } else if (currentCourse !== null && answer) {
        // Add lesson to current subcategory (if Platinum Fast Track) or to course
        if (currentSubcategory !== null && isPlatinumCourse) {
          // Add to subcategory
          subcategoryLessonCounter++;
          const lessonId = `${currentCourse.id}-${currentSubcategory.id}-${subcategoryLessonCounter}`;
          currentSubcategory.lessons.push({
            id: lessonId,
            title: question,
            url: answer,
            completed: false,
          });
        } else {
          // Add to course lessons directly
          lessonCounter++;
          const lessonId = `${currentCourse.id}-${lessonCounter}`;
          currentCourse.lessons.push({
            id: lessonId,
            title: question,
            url: answer,
            completed: false,
          });
          
          // Log lessons being added to June DMP
          if (currentCourse.title.toLowerCase().includes('june') && currentCourse.title.toLowerCase().includes('dmp')) {
            console.log(`  📌 Adding lesson ${lessonCounter} to June DMP: "${question.substring(0, 50)}..."`);
          }
        }
      }
    });

    // Add last subcategory if exists
    if (currentSubcategory !== null && currentCourse !== null) {
      const course = currentCourse as CourseTrackingData;
      const subcat = currentSubcategory as CourseSubcategory;
      if (!course.subcategories) {
        course.subcategories = [];
      }
      course.subcategories.push(subcat);
      console.log(`📂 Saved final subcategory "${subcat.title}" with ${subcat.lessons.length} lessons (end of file)`);
    }

    // Add last course
    if (currentCourse !== null) {
      courses.push(currentCourse);
    }

    // Merge "June'25 DMP Recordings" and ALL subsequent DMP-related courses into "DMP - Daily Magic Practice Recordings" course
    const dmpCourseIndex = courses.findIndex(c => 
      c.title.toLowerCase().includes('dmp') && 
      c.title.toLowerCase().includes('daily') &&
      c.title.toLowerCase().includes('magic')
    );
    const juneDmpIndex = courses.findIndex(c => 
      c.title.toLowerCase().includes("june") && 
      c.title.toLowerCase().includes("dmp") &&
      c.title.toLowerCase().includes("recording")
    );

    if (dmpCourseIndex !== -1 && juneDmpIndex !== -1) {
      const dmpCourse = courses[dmpCourseIndex];
      let totalMergedLessons = 0;
      const coursesToRemove: number[] = [];
      
      console.log(`🔍 Found ${courses.length - juneDmpIndex} courses starting from June'25 DMP position (index ${juneDmpIndex})`);
      
      // Known non-DMP courses to skip (these are real courses, not recordings)
      const knownCourses = [
        'platinum fast track',
        'basic law of attraction',
        'advance law of attraction',
        'relationship mastery',
        'money master',
        'health master',
        'career master',
        'life problems',
        'life skill'
      ];
      
      // Merge June'25 DMP and ALL courses after it that look like recordings
      for (let i = juneDmpIndex; i < courses.length; i++) {
        const currentCourse = courses[i];
        const title = currentCourse.title.toLowerCase();
        
        // Check if this is a known non-DMP course
        const isKnownCourse = knownCourses.some(known => title.includes(known));
        
        if (isKnownCourse) {
          console.log(`⏭️  Skipping "${currentCourse.title}" (known non-recording course)`);
          continue;
        }
        
        // Check course title for recording indicators
        const titleHasDatePattern = /\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(currentCourse.title);
        const titleHasRecording = title.includes('recording') || title.includes('dmp');
        
        // Check if ANY lesson has date pattern (7th June, 8th June, etc.)
        const hasLessonsWithDates = currentCourse.lessons.some(lesson => 
          /\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(lesson.title)
        );
        
        // Merge if it looks like a recording course
        if (titleHasDatePattern || titleHasRecording || hasLessonsWithDates) {
          console.log(`📦 Merging ${currentCourse.lessons.length} lessons from "${currentCourse.title}"`);
          if (currentCourse.lessons.length > 0) {
            console.log(`   First lesson: "${currentCourse.lessons[0].title.substring(0, 60)}..."`);
            if (currentCourse.lessons.length > 1) {
              console.log(`   Last lesson: "${currentCourse.lessons[currentCourse.lessons.length - 1].title.substring(0, 60)}..."`);
            }
          }
          dmpCourse.lessons = dmpCourse.lessons.concat(currentCourse.lessons);
          totalMergedLessons += currentCourse.lessons.length;
          coursesToRemove.push(i);
        } else {
          console.log(`⏭️  Skipping "${currentCourse.title}" (doesn't match recording pattern)`);
        }
      }
      
      // Remove merged courses in reverse order to maintain indices
      for (let i = coursesToRemove.length - 1; i >= 0; i--) {
        courses.splice(coursesToRemove[i], 1);
      }
      
      console.log(`✅ Merged ${totalMergedLessons} total lessons from ${coursesToRemove.length} recording courses into "DMP - Daily Magic Practice Recordings"`);
      console.log(`📚 Total DMP course lessons: ${dmpCourse.lessons.length}`);
    } else {
      if (dmpCourseIndex === -1) console.log('⚠️  DMP - Daily Magic Practice Recordings course not found');
      if (juneDmpIndex === -1) console.log('⚠️  June\'25 DMP Recordings course not found');
    }

    // Merge mastery courses into Platinum Fast Track as subcategories
    const platinumCourseIndex = courses.findIndex(c => 
      c.title.toLowerCase().includes('platinum') && 
      c.title.toLowerCase().includes('fast')
    );
    
    if (platinumCourseIndex !== -1) {
      const platinumCourse = courses[platinumCourseIndex];
      console.log(`🔍 Found Platinum Fast Track course at index ${platinumCourseIndex}`);
      
      // Mastery courses to merge as subcategories
      const masteryCourseMappings = [
        { 
          matcher: (title: string) => title.includes('career') && (title.includes('mastery') || title.includes('master')),
          subcategoryName: 'Career Mastery' 
        },
        { 
          matcher: (title: string) => (title.includes('wealth') || title.includes('money')) && (title.includes('mastery') || title.includes('master')),
          subcategoryName: 'Wealth Mastery' 
        },
        { 
          matcher: (title: string) => title.includes('health') && (title.includes('mastery') || title.includes('master')),
          subcategoryName: 'Health Mastery' 
        }
      ];
      
      const coursesToMergeAsSubcategories: number[] = [];
      
      // Find and merge each mastery course
      for (const mapping of masteryCourseMappings) {
        const courseIndex = courses.findIndex((c, idx) => {
          if (idx === platinumCourseIndex) return false; // Skip platinum itself
          const title = c.title.toLowerCase();
          return mapping.matcher(title);
        });
        
        if (courseIndex !== -1) {
          const masteryCourse = courses[courseIndex];
          console.log(`📦 Merging "${masteryCourse.title}" into Platinum Fast Track as "${mapping.subcategoryName}" subcategory (${masteryCourse.lessons.length} lessons)`);
          
          // Create or update subcategory
          if (!platinumCourse.subcategories) {
            platinumCourse.subcategories = [];
          }
          
          // Check if subcategory already exists
          const existingSubcatIdx = platinumCourse.subcategories.findIndex(s => 
            s.title.toLowerCase() === mapping.subcategoryName.toLowerCase()
          );
          
          if (existingSubcatIdx !== -1) {
            // Append lessons to existing subcategory
            platinumCourse.subcategories[existingSubcatIdx].lessons = 
              platinumCourse.subcategories[existingSubcatIdx].lessons.concat(masteryCourse.lessons);
            console.log(`   ✅ Added ${masteryCourse.lessons.length} lessons to existing "${mapping.subcategoryName}" subcategory`);
          } else {
            // Create new subcategory
            const subcategoryId = mapping.subcategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            platinumCourse.subcategories.push({
              id: subcategoryId,
              title: mapping.subcategoryName,
              lessons: masteryCourse.lessons
            });
            console.log(`   ✅ Created new "${mapping.subcategoryName}" subcategory with ${masteryCourse.lessons.length} lessons`);
          }
          
          coursesToMergeAsSubcategories.push(courseIndex);
        } else {
          console.log(`⚠️  No course found for "${mapping.subcategoryName}"`);
        }
      }
      
      // Remove merged courses in reverse order
      for (let i = coursesToMergeAsSubcategories.length - 1; i >= 0; i--) {
        courses.splice(coursesToMergeAsSubcategories[i], 1);
      }
      
      if (coursesToMergeAsSubcategories.length > 0) {
        console.log(`✅ Merged ${coursesToMergeAsSubcategories.length} mastery courses into Platinum Fast Track`);
        console.log(`📚 Platinum Fast Track now has ${platinumCourse.subcategories?.length || 0} subcategories`);
      }

      // Add nested sub-courses within Career Mastery
      const careerMasterySubcat = platinumCourse.subcategories?.find(s => 
        s.title.toLowerCase() === 'career mastery'
      );
      
      if (careerMasterySubcat) {
        console.log('🎯 Adding nested sub-courses to Career Mastery...');
        
        // Define nested sub-courses for Career Mastery
        const careerNestedCourses = [
          { name: 'Life Coaching', matcher: (title: string) => title.toLowerCase().includes('life') && title.toLowerCase().includes('coaching') },
          { name: 'Online Selling with 5 days Challenge', matcher: (title: string) => title.toLowerCase().includes('online') && title.toLowerCase().includes('selling') },
          { name: 'LOA With Vastu Frequency', matcher: (title: string) => title.toLowerCase().includes('loa') && title.toLowerCase().includes('vastu') && title.toLowerCase().includes('frequency') },
          { name: 'LOA Remedies For Vastu', matcher: (title: string) => title.toLowerCase().includes('loa') && title.toLowerCase().includes('remedies') && title.toLowerCase().includes('vastu') },
          { name: 'Canva Graphic Design Mastery', matcher: (title: string) => title.toLowerCase().includes('canva') && title.toLowerCase().includes('graphic') },
          { name: 'Lead Business', matcher: (title: string) => title.toLowerCase().includes('lead') && title.toLowerCase().includes('business') },
          { name: 'Digital Coaching System', matcher: (title: string) => title.toLowerCase().includes('digital') && title.toLowerCase().includes('coaching') && title.toLowerCase().includes('system') },
          { name: 'Lead Self', matcher: (title: string) => title.toLowerCase().includes('lead') && title.toLowerCase().includes('self') },
          { name: 'Corporate Train The Trainer by Mitesh Khatri', matcher: (title: string) => title.toLowerCase().includes('corporate') && title.toLowerCase().includes('train') && title.toLowerCase().includes('trainer') },
        ];

        const nestedCoursesToRemove: number[] = [];
        careerMasterySubcat.subcategories = [];

        // Find and add each nested course
        for (const nestedCourse of careerNestedCourses) {
          const courseIndex = courses.findIndex(c => nestedCourse.matcher(c.title));
          
          if (courseIndex !== -1) {
            const course = courses[courseIndex];
            console.log(`   📦 Adding "${course.title}" as nested sub-course under Career Mastery (${course.lessons.length} lessons)`);
            
            const subcategoryId = nestedCourse.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            careerMasterySubcat.subcategories.push({
              id: subcategoryId,
              title: nestedCourse.name,
              lessons: course.lessons
            });
            
            nestedCoursesToRemove.push(courseIndex);
          } else {
            console.log(`   ⚠️  Course not found for "${nestedCourse.name}"`);
          }
        }

        // Remove nested courses in reverse order
        for (let i = nestedCoursesToRemove.length - 1; i >= 0; i--) {
          courses.splice(nestedCoursesToRemove[i], 1);
        }

        console.log(`   ✅ Added ${careerMasterySubcat.subcategories.length} nested sub-courses to Career Mastery`);
      } else {
        console.log('   ⚠️  Career Mastery subcategory not found');
      }

      // Add nested sub-courses within Health Mastery
      const healthMasterySubcat = platinumCourse.subcategories?.find(s => 
        s.title.toLowerCase() === 'health mastery'
      );
      
      if (healthMasterySubcat) {
        console.log('🎯 Adding nested sub-courses to Health Mastery...');
        
        // Define nested sub-courses for Health Mastery
        const healthNestedCourses = [
          { name: 'Morning Happy Gym Dance Videos', matcher: (title: string) => title.toLowerCase().includes('morning') && title.toLowerCase().includes('happy') && title.toLowerCase().includes('gym') },
          { name: 'Pineal Gland Meditation', matcher: (title: string) => {
              const lower = title.toLowerCase();
              return (lower.includes('pineal') || lower.includes('penial')) && lower.includes('gland') && lower.includes('meditation');
            }
          },
          { name: 'Depression To Celebration', matcher: (title: string) => title.toLowerCase().includes('depression') && title.toLowerCase().includes('celebration') },
        ];

        const healthNestedCoursesToRemove: number[] = [];
        healthMasterySubcat.subcategories = [];

        // Find and add each nested course
        for (const nestedCourse of healthNestedCourses) {
          const courseIndex = courses.findIndex(c => nestedCourse.matcher(c.title));
          
          if (courseIndex !== -1) {
            const course = courses[courseIndex];
            console.log(`   📦 Adding "${course.title}" as nested sub-course under Health Mastery (${course.lessons.length} lessons)`);
            
            const subcategoryId = nestedCourse.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            healthMasterySubcat.subcategories.push({
              id: subcategoryId,
              title: nestedCourse.name,
              lessons: course.lessons
            });
            
            healthNestedCoursesToRemove.push(courseIndex);
          } else {
            console.log(`   ⚠️  Course not found for "${nestedCourse.name}"`);
          }
        }

        // Remove nested courses in reverse order
        for (let i = healthNestedCoursesToRemove.length - 1; i >= 0; i--) {
          courses.splice(healthNestedCoursesToRemove[i], 1);
        }

        console.log(`   ✅ Added ${healthMasterySubcat.subcategories.length} nested sub-courses to Health Mastery`);
      } else {
        console.log('   ⚠️  Health Mastery subcategory not found');
      }

      // Add nested sub-courses within Relationship Mastery
      const relationshipMasterySubcat = platinumCourse.subcategories?.find(s => 
        s.title.toLowerCase() === 'relationship mastery'
      );
      
      if (relationshipMasterySubcat) {
        console.log('🎯 Adding nested sub-courses to Relationship Mastery...');
        
        // Define nested sub-courses for Relationship Mastery
        const relationshipNestedCourses = [
          { name: 'Practical Spirituality', matcher: (title: string) => title.toLowerCase().includes('practical') && title.toLowerCase().includes('spirituality') },
          { name: "Dr. John Demartini's Values By Mitesh Khatri", matcher: (title: string) => title.toLowerCase().includes('demartini') && title.toLowerCase().includes('values') },
          { name: 'Demartini Method Explained by Mitesh Khatri', matcher: (title: string) => title.toLowerCase().includes('demartini') && title.toLowerCase().includes('method') },
        ];

        const relationshipNestedCoursesToRemove: number[] = [];
        relationshipMasterySubcat.subcategories = [];

        // Find and add each nested course
        for (const nestedCourse of relationshipNestedCourses) {
          const courseIndex = courses.findIndex(c => nestedCourse.matcher(c.title));
          
          if (courseIndex !== -1) {
            const course = courses[courseIndex];
            console.log(`   📦 Adding "${course.title}" as nested sub-course under Relationship Mastery (${course.lessons.length} lessons)`);
            
            const subcategoryId = nestedCourse.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            relationshipMasterySubcat.subcategories.push({
              id: subcategoryId,
              title: nestedCourse.name,
              lessons: course.lessons
            });
            
            relationshipNestedCoursesToRemove.push(courseIndex);
          } else {
            console.log(`   ⚠️  Course not found for "${nestedCourse.name}"`);
          }
        }

        // Remove nested courses in reverse order
        for (let i = relationshipNestedCoursesToRemove.length - 1; i >= 0; i--) {
          courses.splice(relationshipNestedCoursesToRemove[i], 1);
        }

        console.log(`   ✅ Added ${relationshipMasterySubcat.subcategories.length} nested sub-courses to Relationship Mastery`);
      } else {
        console.log('   ⚠️  Relationship Mastery subcategory not found');
      }

      // Add nested sub-courses within Wealth Mastery
      const wealthMasterySubcat = platinumCourse.subcategories?.find(s => 
        s.title.toLowerCase() === 'wealth mastery'
      );
      
      if (wealthMasterySubcat) {
        console.log('🎯 Adding nested sub-courses to Wealth Mastery...');
        
        // Define nested sub-courses for Wealth Mastery
        const wealthNestedCourses = [
          { name: 'Investing & Saving', matcher: (title: string) => title.toLowerCase().includes('investing') && title.toLowerCase().includes('saving') },
        ];

        const wealthNestedCoursesToRemove: number[] = [];
        wealthMasterySubcat.subcategories = [];

        // Find and add each nested course
        for (const nestedCourse of wealthNestedCourses) {
          const courseIndex = courses.findIndex(c => nestedCourse.matcher(c.title));
          
          if (courseIndex !== -1) {
            const course = courses[courseIndex];
            console.log(`   📦 Adding "${course.title}" as nested sub-course under Wealth Mastery (${course.lessons.length} lessons)`);
            
            const subcategoryId = nestedCourse.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            wealthMasterySubcat.subcategories.push({
              id: subcategoryId,
              title: nestedCourse.name,
              lessons: course.lessons
            });
            
            wealthNestedCoursesToRemove.push(courseIndex);
          } else {
            console.log(`   ⚠️  Course not found for "${nestedCourse.name}"`);
          }
        }

        // Remove nested courses in reverse order
        for (let i = wealthNestedCoursesToRemove.length - 1; i >= 0; i--) {
          courses.splice(wealthNestedCoursesToRemove[i], 1);
        }

        console.log(`   ✅ Added ${wealthMasterySubcat.subcategories.length} nested sub-courses to Wealth Mastery`);
      } else {
        console.log('   ⚠️  Wealth Mastery subcategory not found');
      }
    } else {
      console.log('⚠️  Platinum Fast Track course not found');
    }

    // Filter out "Relationship Mastery" course completely from the list
    const relationshipMasteryIndex = courses.findIndex(c => 
      c.title.toLowerCase().includes('relationship') && c.title.toLowerCase().includes('mastery')
    );
    if (relationshipMasteryIndex !== -1) {
      console.log(`🗑️  Removing "Relationship Mastery with Mitesh Khatri" from course list`);
      courses.splice(relationshipMasteryIndex, 1);
    }

    // Remove any remaining duplicate courses that should only appear within Platinum Fast Track
    const duplicateMatchers = [
      // Career Mastery nested courses
      (title: string) => title.toLowerCase().includes('life') && title.toLowerCase().includes('coaching'),
      (title: string) => title.toLowerCase().includes('online') && title.toLowerCase().includes('selling'),
      (title: string) => title.toLowerCase().includes('loa') && title.toLowerCase().includes('vastu') && title.toLowerCase().includes('frequency'),
      (title: string) => title.toLowerCase().includes('loa') && title.toLowerCase().includes('remedies') && title.toLowerCase().includes('vastu'),
      (title: string) => title.toLowerCase().includes('canva') && title.toLowerCase().includes('graphic'),
      (title: string) => title.toLowerCase().includes('lead') && title.toLowerCase().includes('business'),
      (title: string) => title.toLowerCase().includes('digital') && title.toLowerCase().includes('coaching') && title.toLowerCase().includes('system'),
      (title: string) => title.toLowerCase().includes('lead') && title.toLowerCase().includes('self'),
      (title: string) => title.toLowerCase().includes('corporate') && title.toLowerCase().includes('train') && title.toLowerCase().includes('trainer'),
      // Health Mastery nested courses
      (title: string) => title.toLowerCase().includes('morning') && title.toLowerCase().includes('happy') && title.toLowerCase().includes('gym'),
      (title: string) => {
        const lower = title.toLowerCase();
        return (lower.includes('pineal') || lower.includes('penial')) && lower.includes('gland') && lower.includes('meditation');
      },
      // Relationship Mastery nested courses
      (title: string) => title.toLowerCase().includes('practical') && title.toLowerCase().includes('spirituality'),
      (title: string) => title.toLowerCase().includes('demartini') && title.toLowerCase().includes('values'),
      (title: string) => title.toLowerCase().includes('demartini') && title.toLowerCase().includes('method'),
      // Wealth Mastery nested courses
      (title: string) => title.toLowerCase().includes('investing') && title.toLowerCase().includes('saving'),
    ];

    const coursesToRemove: number[] = [];
    for (let i = 0; i < courses.length; i++) {
      for (const matcher of duplicateMatchers) {
        if (matcher(courses[i].title)) {
          coursesToRemove.push(i);
          console.log(`🗑️  Removing duplicate "${courses[i].title}" (already in Platinum Fast Track)`);
          break;
        }
      }
    }

    // Remove duplicates in reverse order
    for (let i = coursesToRemove.length - 1; i >= 0; i--) {
      courses.splice(coursesToRemove[i], 1);
    }

    if (coursesToRemove.length > 0) {
      console.log(`✅ Removed ${coursesToRemove.length} duplicate courses from main list`);
    }

    cachedCourseTracking = courses;
    courseTrackingCacheTimestamp = Date.now();
    console.log(`Loaded ${courses.length} courses from Google Sheets with ${courses.reduce((sum, c) => sum + c.lessons.length, 0)} total lessons`);
    
    return courses;
  } catch (error) {
    console.error('Error fetching course tracking data from Google Sheets:', error);
    console.warn('Falling back to mock course data. Please configure Google Sheets access properly.');
    
    // Return fallback mock data when Google Sheets fails
    const mockCourses: CourseTrackingData[] = [
      {
        id: 'basic-loa',
        title: 'Basic Law of Attraction',
        url: 'https://www.miteshkhatri.com/Basic',
        tags: ['LOA', 'Manifestation'],
        source: 'Mitesh Khatri',
        estimatedHours: 15,
        status: 'not_started',
        progressPercent: 0,
        category: 'default',
        lessons: [
          { id: 'bloa-intro', title: 'Basic Law of Attraction Course', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction', completed: false },
          { id: 'bloa-1', title: 'Law of Attraction Basic LIVE - English', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction', completed: false },
          { id: 'bloa-2', title: 'How to Create Affirmation to Attract Your Goals', url: 'https://coaching.miteshkhatri.com/products/basic-law-of-attraction', completed: false },
        ]
      },
      {
        id: 'advance-loa',
        title: 'Advance Law of Attraction',
        url: 'https://www.miteshkhatri.com/ALOAL01',
        tags: ['LOA', 'Advanced'],
        source: 'Mitesh Khatri',
        estimatedHours: 20,
        status: 'not_started',
        progressPercent: 0,
        category: 'default',
        lessons: [
          { id: 'aloa-1', title: 'Lesson 1 - Upgrading Your Emotional Frequency', url: 'https://www.miteshkhatri.com/ALOAL1', completed: false },
          { id: 'aloa-2', title: 'Lesson 2 - Match your FTBA Frequency with your Goal', url: 'https://www.miteshkhatri.com/FTBA', completed: false },
          { id: 'aloa-3', title: 'Lesson 3 - Emotional Conditions', url: 'https://www.miteshkhatri.com/EmotionalPurpose', completed: false },
        ]
      },
      {
        id: 'ho-oponopono',
        title: 'Ho\'oponopono and EFT Certification',
        url: 'https://www.miteshkhatri.com/HOOPL1',
        tags: ['Healing', 'EFT'],
        source: 'Mitesh Khatri',
        estimatedHours: 25,
        status: 'not_started',
        progressPercent: 0,
        category: 'Health',
        lessons: [
          { id: 'ho-1', title: 'Lesson 1 - Introduction to Ho\'oponopono', url: 'https://www.miteshkhatri.com/HOOPL1', completed: false },
          { id: 'ho-2', title: 'Lesson 2 - EFT Basics', url: 'https://www.miteshkhatri.com/HOOPL2', completed: false },
          { id: 'ho-3', title: 'Lesson 3 - Advanced Techniques', url: 'https://www.miteshkhatri.com/HOOPL3', completed: false },
        ]
      }
    ];
    
    // Cache the mock data to avoid repeated logging
    cachedCourseTracking = mockCourses;
    courseTrackingCacheTimestamp = Date.now();
    
    return mockCourses;
  }
}
