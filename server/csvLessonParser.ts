import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CourseLesson {
  id: string;
  title: string;
  link: string;
  duration: string;
  difficulty: string;
  courseName: string;
}

let cachedLessons: Map<string, CourseLesson[]> | null = null;

export function parseCourseLessons(): Map<string, CourseLesson[]> {
  if (cachedLessons) {
    return cachedLessons;
  }

  const csvPath = path.join(__dirname, 'hrcm-courses.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1); // Skip header

  const lessonsByCourse = new Map<string, CourseLesson[]>();

  lines.forEach((line, index) => {
    if (!line.trim()) return;

    const parts = line.split(',');
    if (parts.length < 10) return;

    const courseName = parts[0].trim();
    const link = parts[1].trim();
    const difficulty = parts[8]?.trim() || 'Beginner';
    const duration = parts[9]?.trim() || '20 min';

    // Extract main course name (before " - Lesson")
    const courseMatch = courseName.match(/^([^-]+)\s*-/);
    if (!courseMatch) return;

    const mainCourseName = courseMatch[1].trim();

    // Create lesson object
    const lesson: CourseLesson = {
      id: `lesson-${index}`,
      title: courseName,
      link: link,
      duration: duration,
      difficulty: difficulty,
      courseName: mainCourseName
    };

    // Group by main course name
    if (!lessonsByCourse.has(mainCourseName)) {
      lessonsByCourse.set(mainCourseName, []);
    }
    lessonsByCourse.get(mainCourseName)!.push(lesson);
  });

  cachedLessons = lessonsByCourse;
  console.log('Parsed lessons by course:', Array.from(lessonsByCourse.keys()));
  
  return lessonsByCourse;
}

export function getHealthMasteryLessons(): CourseLesson[] {
  const allLessons = parseCourseLessons();
  return allLessons.get('Health Mastery & Happy Gym') || 
         allLessons.get('Health Mastery Batch 2') || 
         [];
}

export function getWealthMasteryLessons(): CourseLesson[] {
  const allLessons = parseCourseLessons();
  return allLessons.get('Wealth Mastery') || [];
}

export function getRelationshipMasteryLessons(): CourseLesson[] {
  const allLessons = parseCourseLessons();
  return allLessons.get('Relationship Mastery') || [];
}
