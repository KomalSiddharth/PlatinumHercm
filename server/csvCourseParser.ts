import fs from 'fs';
import path from 'path';

export interface EnhancedCourseData {
  courseName: string;
  link: string;
  hercmAreas: string[];
  keywords: string[];
  targetProblems: string[];
  targetFeelings: string[];
  beliefTargets: string[];
  actionSuggestions: string[];
  difficulty: string;
  duration: string;
}

let cachedCourses: EnhancedCourseData[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Parse CSV file and return course data
 */
export async function parseCourseCSV(): Promise<EnhancedCourseData[]> {
  // Check cache
  if (cachedCourses.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    console.log(`Returning ${cachedCourses.length} cached courses`);
    return cachedCourses;
  }

  try {
    const csvPath = path.join(process.cwd(), 'server', 'hrcm-courses.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Split by lines and remove header
    const lines = fileContent.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1); // Skip header row
    
    cachedCourses = dataLines.map(line => {
      // Parse CSV line (handle commas inside quotes)
      const values = parseCSVLine(line);
      
      return {
        courseName: values[0] || '',
        link: values[1] || '',
        hercmAreas: (values[2] || '').split(',').map(s => s.trim()).filter(Boolean),
        keywords: (values[3] || '').split(',').map(s => s.trim()).filter(Boolean),
        targetProblems: (values[4] || '').split(',').map(s => s.trim()).filter(Boolean),
        targetFeelings: (values[5] || '').split(',').map(s => s.trim()).filter(Boolean),
        beliefTargets: (values[6] || '').split(',').map(s => s.trim()).filter(Boolean),
        actionSuggestions: (values[7] || '').split(',').map(s => s.trim()).filter(Boolean),
        difficulty: values[8] || '',
        duration: values[9] || '',
      };
    });

    cacheTimestamp = Date.now();
    console.log(`Loaded ${cachedCourses.length} courses from CSV file`);
    
    return cachedCourses;
  } catch (error) {
    console.error('Error parsing course CSV:', error);
    return [];
  }
}

/**
 * Parse a CSV line handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Push the last value
  result.push(current.trim());
  
  return result;
}
