// AI-powered course recommendations using OpenAI
import OpenAI from "openai";
import { EnhancedCourseData } from "./googleSheets";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

interface HERCMInput {
  category: string;
  rating: number;
  problems: string;
  feelings: string;
  beliefs: string;
  actions: string;
}

interface AIRecommendation {
  course: EnhancedCourseData;
  score: number;
  matchReasons: string[];
  aiInsight: string;
}

export async function getAIRecommendations(
  courses: EnhancedCourseData[],
  hercmData: HERCMInput,
  topN: number = 3
): Promise<AIRecommendation[]> {
  
  // Filter courses by HERCM category
  const relevantCourses = courses.filter(course =>
    course.hercmAreas.some(area => area.toLowerCase() === hercmData.category.toLowerCase())
  );

  if (relevantCourses.length === 0) {
    return [];
  }

  // Prepare courses summary for AI
  const coursesSummary = relevantCourses.map((course, idx) => ({
    id: idx,
    name: course.courseName,
    keywords: course.keywords.join(', '),
    targetProblems: course.targetProblems.join(', '),
    targetFeelings: course.targetFeelings.join(', '),
    beliefTargets: course.beliefTargets.join(', '),
    actionSuggestions: course.actionSuggestions.join(', ')
  }));

  const prompt = `You are an expert life coach analyzing a user's HERCM (Health, Relationship, Career, Money) data to recommend the best courses.

**User's Current State (${hercmData.category}):**
- Current Rating: ${hercmData.rating}/10
- Problems: ${hercmData.problems}
- Feelings: ${hercmData.feelings}
- Limiting Beliefs: ${hercmData.beliefs}
- Current Actions: ${hercmData.actions}

**Available Courses:**
${JSON.stringify(coursesSummary, null, 2)}

**Task:**
Analyze the user's problems, feelings, beliefs, and actions. Then recommend the top ${topN} courses that would help them most.

For each recommended course, provide:
1. Course ID (from the list above)
2. Match score (0-100) - how well it addresses their specific situation
3. 2-3 specific reasons why this course matches their needs
4. A personalized insight (1 sentence) explaining the transformation this course will bring

Return ONLY valid JSON in this exact format:
{
  "recommendations": [
    {
      "courseId": 0,
      "score": 95,
      "reasons": ["reason 1", "reason 2"],
      "insight": "personalized insight here"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini", // Using gpt-5-mini for cost efficiency
      messages: [
        { role: "system", content: "You are an expert life coach who recommends personalized courses based on user's challenges and goals. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '{"recommendations": []}';
    const aiResponse = JSON.parse(responseText);

    // Map AI recommendations to full course data
    const recommendations: AIRecommendation[] = aiResponse.recommendations
      .slice(0, topN)
      .map((rec: any) => {
        const course = relevantCourses[rec.courseId];
        return {
          course,
          score: rec.score,
          matchReasons: rec.reasons || [],
          aiInsight: rec.insight || ''
        };
      })
      .filter((rec: AIRecommendation) => rec.course); // Filter out invalid course IDs

    return recommendations;

  } catch (error) {
    console.error('AI recommendation error:', error);
    // Fallback to simple keyword matching if AI fails
    return fallbackRecommendations(relevantCourses, hercmData, topN);
  }
}

// Fallback keyword-based matching
function fallbackRecommendations(
  courses: EnhancedCourseData[],
  hercmData: HERCMInput,
  topN: number
): AIRecommendation[] {
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

  const scored = courses.map(course => {
    let score = 0;
    const reasons: string[] = [];

    const problemMatches = matchKeywords(hercmData.problems, course.targetProblems);
    if (problemMatches > 0) {
      score += problemMatches * 30;
      reasons.push(`Addresses ${problemMatches} of your problems`);
    }

    const beliefMatches = matchKeywords(hercmData.beliefs, course.beliefTargets);
    if (beliefMatches > 0) {
      score += beliefMatches * 30;
      reasons.push(`Transforms ${beliefMatches} limiting beliefs`);
    }

    const feelingMatches = matchKeywords(hercmData.feelings, course.targetFeelings);
    if (feelingMatches > 0) {
      score += feelingMatches * 20;
      reasons.push(`Targets ${feelingMatches} feelings`);
    }

    return {
      course,
      score,
      matchReasons: reasons,
      aiInsight: `This course aligns with your current ${hercmData.category.toLowerCase()} goals.`
    };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
