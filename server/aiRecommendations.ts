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
  topN: number = 3,
  excludeCourseNames: string[] = []
): Promise<AIRecommendation[]> {
  
  // Filter courses by HERCM category and exclude previously recommended courses
  const relevantCourses = courses.filter(course =>
    course.hercmAreas.some(area => area.toLowerCase() === hercmData.category.toLowerCase()) &&
    !excludeCourseNames.includes(course.courseName)
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

  // Check if user has filled triggers (problems/feelings/beliefs/actions)
  const hasUserInput = hercmData.problems || hercmData.feelings || hercmData.beliefs || hercmData.actions;
  
  const prompt = hasUserInput 
    ? `You are an expert life coach analyzing a user's HERCM (Health, Relationship, Career, Money) data to recommend the best courses.

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
}`
    : `You are an expert life coach recommending courses based on rating and category.

**User's Current State:**
- Category: ${hercmData.category}
- Current Rating: ${hercmData.rating}/10
- User has not filled in specific problems yet

**Available Courses:**
${JSON.stringify(coursesSummary, null, 2)}

**Task:**
Since the user is at rating ${hercmData.rating}/10 in ${hercmData.category}, recommend the top ${topN} most popular and foundational courses that would help someone at this level improve.

For beginners (rating 1-3), focus on foundational courses.
For intermediate (rating 4-6), focus on skill-building courses.
For advanced (rating 7+), focus on mastery and optimization courses.

For each recommended course, provide:
1. Course ID (from the list above)
2. Match score (70-90) - based on category match and level appropriateness
3. 2-3 reasons why this course is good for someone at this rating level
4. A motivating insight explaining how this course will help them progress

Return ONLY valid JSON in this exact format:
{
  "recommendations": [
    {
      "courseId": 0,
      "score": 85,
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
      .filter((rec: AIRecommendation) => rec.course && rec.score >= 50); // Filter out invalid course IDs and courses below 50% match

    return recommendations;

  } catch (error) {
    console.error('AI recommendation error:', error);
    // Fallback to simple keyword matching if AI fails
    return fallbackRecommendations(relevantCourses, hercmData, topN);
  }
}

// AI-powered affirmation generation
export async function generateAffirmation(
  category: string,
  rating: number,
  problems: string,
  feelings: string,
  beliefs: string,
  actions: string,
  nextWeekTarget: string
): Promise<string> {
  const prompt = `You are an expert life coach and affirmation specialist. Create a powerful, personalized affirmation for someone working on their ${category}.

**User's Current State (${category}):**
- Current Rating: ${rating}/10
- Problems: ${problems}
- Feelings: ${feelings}
- Limiting Beliefs: ${beliefs}
- Current Actions: ${actions}
- Next Week Target: ${nextWeekTarget}

**Task:**
Create ONE powerful affirmation (1-2 sentences) that:
1. Is in the present tense ("I am", "I have", "I attract")
2. Addresses their specific challenges
3. Reinforces their next week target
4. Is emotionally uplifting and believable
5. Uses positive, empowering language

Return ONLY valid JSON in this exact format:
{
  "affirmation": "your powerful affirmation here"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: "You are an expert affirmation coach who creates powerful, personalized affirmations. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 200,
    });

    const responseText = completion.choices[0]?.message?.content || '{"affirmation": "I am growing stronger every day"}';
    const aiResponse = JSON.parse(responseText);
    
    return aiResponse.affirmation || "I am capable and moving towards my goals with confidence";
    
  } catch (error) {
    console.error('AI affirmation generation error:', error);
    // Fallback affirmations by category
    const fallbackAffirmations: Record<string, string> = {
      'Health': 'I am healthy, strong, and full of energy. My body deserves care and nourishment.',
      'Relationship': 'I attract loving relationships. I communicate with clarity, love, and respect.',
      'Career': 'I am capable and skilled. Success flows to me naturally as I follow my purpose.',
      'Money': 'I am a money magnet. Abundance flows to me from multiple sources with ease.'
    };
    return fallbackAffirmations[category] || "I am growing and improving every single day";
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
