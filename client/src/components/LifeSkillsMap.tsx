import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface SkillMapping {
  problem: string;
  skills: string[];
  skillUrls?: string[];
}

interface CategoryData {
  category: string;
  mappings: SkillMapping[];
}

const lifeSkillsData: CategoryData[] = [
  {
    category: "Basic LOA",
    mappings: [
      {
        problem: "Tuning Frequency To Attract Goals",
        skills: ["Memorise The Science of Why LOA Works"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Attract Any Goal by Tuning your Frequency",
        skills: ["Master Making Affirmations to Tune Frequency"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Maintaining your Frequency throughout the day",
        skills: ["Follow Routine of LOA - 10RG, Water Bottle, Affirmations, Double Happiness, Cancel Cancel & Keep Filling up Magic Diary."],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Clearing Negative Energy",
        skills: ["Experience Ho Opono to Clear Your Negative Energy"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Sub-Conscious Programming",
        skills: ["Practice DMP with me Everyday for Deep Subconscious Programming - Also Use Recordings for Regular Programming"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Ultimate Life Vision",
        skills: ["Ultimate Auto-Biography"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Short Term Life Vision",
        skills: ["Create Your Vision Board", "Create Magic Miracles Diary"],
        skillUrls: ["https://coaching.miteshkhatri.com/", "https://coaching.miteshkhatri.com/"]
      }
    ]
  },
  {
    category: "Health Mastery",
    mappings: [
      {
        problem: "Health Problems",
        skills: ["1. Master Understanding Health"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Limiting Health Beliefs",
        skills: ["2. Breaking Limiting Health Habits"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Weight Loss & Gain, How to Create a Diet Plan and Still Lose Weight",
        skills: ["3. Master the Lifestyle Diet Plans"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Motivation for Weight Loss",
        skills: ["4. Master the 7 Steps to Love Exercising"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "What Workouts to Do",
        skills: ["5. Master Designing your Own Workouts"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      }
    ]
  },
  {
    category: "Wealth Mastery",
    mappings: [
      {
        problem: "Not sure what's my Ultimate Financial Goal",
        skills: ["1. Create Wealth Frequency"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "What exactly is my current Money Frequency?",
        skills: ["2. Recognise your Current Money Frequency"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "What Exactly is Blocking my Money Frequency?",
        skills: ["3. Recognise the Negativity in your Money FTBA"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How can I Create New Money Attraction Frequency?",
        skills: ["4. Create New Money FTBA"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I Release my Negative Money Blocks?",
        skills: ["5. Release Money Blocks with EFT"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How should be my New Emotional Frequency to Attract More Money?",
        skills: ["6. Create New Emotional Frequency for Money"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Why am I not Able to Make More Money? Why is my Income Stuck?",
        skills: ["7. Create New Wealth Beliefs"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "My Income is Limited",
        skills: ["8. Create Multiple Sources of Income (MSI)"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not able to Grow my Business",
        skills: ["9. Increase your Working Income"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not able to Manifest Beyond a Certain Point",
        skills: ["10. Increase your Comfort Zone to Increase your Income"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am Making Money but Still Stressed",
        skills: ["11. Manage Money with PMDSPM"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I don't have the motivation to invest",
        skills: ["12. Understand The Power of Compound Interest"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am Feeling Confused & Stuck for a very long time, should I do it or not.",
        skills: ["13. Fail Fast to Succeed Fast"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am planning a lot but still unable to take action.",
        skills: ["14. Sell First Make Later"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I feel like a Failure, Frustrated, Sad when I am not able to make money.",
        skills: ["15. Create a High Self Esteem to Attract More Money"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I lack the drive to make money, I keep postponing my actions",
        skills: ["16. Align Your 6 Needs with your Money Goals"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am feeling poor, feeling small, not good enough.",
        skills: ["17. Live Life Like a Millionaire for 24 Hrs"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not able to convince, influence, get a promotion.",
        skills: ["18. Perception Management"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not able to start a business, I am not able to grow my business.",
        skills: ["19. Invest More Money To Make More Money"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not able to make a decision, I am confused, what should I do?",
        skills: ["20. Making Decisions Like a Millionaire"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I make Investments to Make Passive Income?",
        skills: ["21. Make Investments Like a Millionaire"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I do Affiliate Marketing?",
        skills: ["22. Making Millions with Affiliate Marketing"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not able to Attract the Work I Love, I want to change my Job but I am not able to.",
        skills: ["23. Love Your Work More Than Money"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I feel like I don't have enough, I feel I have lack of money all the time, I feel helpless and poor.",
        skills: ["24. Unconditional Giving"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Importance of Vastu",
        skills: ["25. Importance of Vastu"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      }
    ]
  },
  {
    category: "NLP",
    mappings: [
      {
        problem: "I am not able to control my thoughts",
        skills: ["1. Understand What is NLP & Generalisation, Distortion & Deletion"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I don't understand why people think and talk like that.",
        skills: ["1. Understand What is NLP & Generalisation, Distortion & Deletion"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I don't know how to my control my mind, I cant stop thinking.",
        skills: ["2. Understand NLP Modalities - VAK"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I forget things, I enjoy anything fully",
        skills: ["3. Increasing VAK Senses Practice"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am able to Control how I Feel in specific situations of my life.",
        skills: ["4. Master Sub-Modalities to Master your Emotions & Thoughts"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not able to change my Limiting Beliefs",
        skills: ["5. Changing Beliefs with Sub-Modalities"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I Have Panic Attacks / I Have Phobias / I Get Scared Easily / I Feel Fear by Habit",
        skills: ["6. Cure Phobias with Sub-Modalities"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "By Habit I Feel Angry, Irritated, Frustrated, Sad, Hurt, Lack of Love, Helpless, Anxious, Pressure and all negative Emotions.",
        skills: ["7. Master Anchoring to Stop Any Negative Emotion & Create Any Positive Emotion"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I would like to feel more Calm, Relaxed, Patience, Happy, Confident, Love, Courage, all Positive Emotions by Automatic Habit.",
        skills: ["7. Master Anchoring to Stop Any Negative Emotion & Create Any Positive Emotion"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not able to Believe in myself",
        skills: ["8. Learn To Change Beliefs Fast with Sub-Modalities"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I have Nail Biting Habits, All Compulsive Bad Habits",
        skills: ["9. Swish Pattern"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Managing Multiple Anchors",
        skills: ["10. Stancking & Collapse Anchors"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not able to convince myself and others easily. Its taking me too much time to succeed. I am not able to get desired results. How can I replacate someone's success?",
        skills: ["11. Master Metaphors Influence on yourself & Others", "12. Modelling for FastTrack Success"],
        skillUrls: ["https://coaching.miteshkhatri.com/", "https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do i make anyone Comfortable in 10 Mins?",
        skills: ["13. Rapport Building"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I influence and convince people like a Master?",
        skills: ["14. Hypnotic Language Pattern to Master Influence - Meta & Milton Model"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Discovering Success Strategies",
        skills: ["15. Discovering VAK Strategies to Discover Success Model"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How can I make instant changes to my Emotions and Perspective?",
        skills: ["16. Master TimeLine Questions for Instantly Changing Emotions"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How can instantly change the way I feel?",
        skills: ["17. Transformational Vocabulary"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How can I control the way people think and what they think?",
        skills: ["18. Pre-Framing, Re-Framing & Post-Framing"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      }
    ]
  },
  {
    category: "Relationship Mastery",
    mappings: [
      {
        problem: "I don't understand Why my relationships don't work? I am completely frustrated with my Relationship problems.",
        skills: ["1. Understand What is Relationships"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am angry with my partner, I don't have the same relationship I used to.",
        skills: ["2. Master Dropping Rackets Instantly"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I don't understand why he/she behaves like this. I just cannot tolerate this behaviour of my partner.",
        skills: ["3. Master Reflections"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I feel irritated and lack of love and sad all the time.",
        skills: ["4. Programming Self Love & Acceptance"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Why is my partner not able to fulfill my expectations.",
        skills: ["5. Master Balanced Perspective for Acceptance"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I feel so helpless, angry, irritated, sad, negative all the time in my relationship. I find it really difficult to feel love, happiness, comfortable in my relationship the way I used to.",
        skills: ["6. Master Rules of Love"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Relationship Rituals",
        skills: ["7. Master Rituals of Love"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "My partner has too much Ego and I don't know how to manage that.",
        skills: ["8. Master Ego Management in Relationships"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "We are very different from each other, he/she never listens to me, does not trust me, doubts me, controls me.",
        skills: ["9. Understanding Differences & Mastering Trust Bank Account"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      }
    ]
  },
  {
    category: "Lead Self",
    mappings: [
      {
        problem: "What Is Leadership?",
        skills: ["Leadership"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Managing Your Emotional Energy",
        skills: ["Emotional Energy"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Emotional Patterns Exercise",
        skills: ["Emotional Patterns Exercise"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Control your Focus & Meanings",
        skills: ["Control your Focus & Meanings"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Conditioning Exercise P+F",
        skills: ["Conditioning Exercise P+F"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Creating Emotions at Will - Anchoring Exercise",
        skills: ["Creating Emotions at Will - Anchoring Exercise"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Creating Vision with Standards & Purpose",
        skills: ["Creating Vision with Standards & Purpose"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Clarity of Values - The Foundation of Unlimited Power",
        skills: ["Clarity of Values - The Foundation of Unlimited Power"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Creating Beliefs to Support Your Values",
        skills: ["Creating Beliefs to Support Your Values"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Recognising & Changing Beliefs",
        skills: ["Recognising & Changing Beliefs"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Understanding & Rewiring Your Needs",
        skills: ["Understanding & Rewiring Your Needs"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Integration of Complete Psychology",
        skills: ["Integration of Complete Psychology"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Managing Conflicts like a Leader",
        skills: ["Managing Conflicts like a Leader", "9. Conflict Management"],
        skillUrls: ["https://coaching.miteshkhatri.com/", "https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Balancing your Yin-Yang Energy",
        skills: ["Balancing your Yin-Yang Energy"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Managing Time Like a Leader",
        skills: ["Managing Time Like a Leader", "11. Time Management"],
        skillUrls: ["https://coaching.miteshkhatri.com/", "https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Recap of all Lead Self Modules",
        skills: ["Recap of all Lead Self Modules"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      }
    ]
  },
  {
    category: "Lead People",
    mappings: [
      {
        problem: "What exactly is Leading people?",
        skills: ["1. Leadership Transition"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not able to get along with my Boss, colleagues, etc. People don't listen to me, don't understand me.",
        skills: ["2. Rapport Building"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "My Boss does not appreciate my work, my colleagues don't like me.",
        skills: ["3. Perception Management"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not able to fulfill my Boss Expectations, I have too many conflicts in my relationships.",
        skills: ["4. Firo-B"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "People don't listen to me, they don't trust me, they are angry with me, they are not convinced with me, they don't follow what I say.",
        skills: ["5. Trust Bank Account"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Leadership Styles",
        skills: ["6. Situational Leadership Styles"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Balanced Perspective",
        skills: ["7. Balanced Perspective"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Giving Feedback",
        skills: ["8. How to Give Feedback"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Category of Relationships",
        skills: ["9. Category of Relationships"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Decision Making",
        skills: ["10. Decision Making"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Training & Coaching People",
        skills: ["11. Training & Coaching People"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Appraisal Skills",
        skills: ["12. Appraisal Skills"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "I am not happy with my current job, I am frustrated with my Boss, I want to change my job desperately, I am not paid as per my strengths.",
        skills: ["1. The Entrepreneur Identity"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      }
    ]
  },
  {
    category: "Train The Trainer",
    mappings: [
      {
        problem: "How do I become a really Rich & Powerful Trainer?",
        skills: ["1. 5 Principles of Being a Rich & Powerful Trainer"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I start a Training in a very Impressive way?",
        skills: ["2. How to Start a Training Session with a WOW Impact"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I control the flow of my Training? How do I handle Objections?",
        skills: ["3. Power of Pre-Framing, Re-Framing & Post-Framing"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I Engage my Students?",
        skills: ["4. How to Reframe to Engage your Audience", "5. Multiple Methods to Keep your Audience Engaged"],
        skillUrls: ["https://coaching.miteshkhatri.com/", "https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How can I become more Confident with Public Speaking?",
        skills: ["6. How to Create Extraordinary Comfort for Public Speaking"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I handle difficult people and difficult questions?",
        skills: ["7. How to Handle Difficult People Questions"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How can I design my courses for creating amazing results?",
        skills: ["8. 4 Steps to Design Trainings Like a Master"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I sell & market my trainings and courses?",
        skills: ["9. Selling & Marketing your Courses"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      }
    ]
  },
  {
    category: "Digital Coaching System - Becoming a Digital Millionaire Coach",
    mappings: [
      {
        problem: "What topic should I coach on?",
        skills: ["1. Niche Clarity Blueprint"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I create my Course? How many chapters should it have? How long should it be?",
        skills: ["2. Creating Result Oriented Courses"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I Attract Clients?",
        skills: ["3. Attracting Clients with Trust Building Webinars"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I Create my Courses Platform, Videos, Email Marketing.",
        skills: ["4. Creating your Website in Kajabi"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I create my Video Lessons? What Equipment do I use?",
        skills: ["5. How to Create your Video Lessons"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "How do I create Facebook Ads?",
        skills: ["6. How to Create Facebook Ads"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Lack of Confidence, Lack of Courage",
        skills: ["Catch Patterns", "Affirmations for Being a Successful Coach"],
        skillUrls: ["https://coaching.miteshkhatri.com/", "https://coaching.miteshkhatri.com/"]
      }
    ]
  },
  {
    category: "Practical Spirituality",
    mappings: [
      {
        problem: "What is Pratical Spirituality?",
        skills: ["Practical Spirituality, Two parts of spirituality"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Practical Spirituality Lesson 2",
        skills: ["Practical Spirituality Lesson 2"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Practical Spirituality Meditation",
        skills: ["Practical Spirituality Meditation"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Practical Spirituality Lesson 3",
        skills: ["Practical Spirituality Lesson 3"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Practical Spirituality Lesson 4",
        skills: ["Practical Spirituality Lesson 4"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Practical Spirituality Lesson 4 Sharing",
        skills: ["Practical Spirituality Lesson 4 Sharing"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Practical Spirituality Lesson 5",
        skills: ["Practical Spirituality Lesson 5"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Practical Spirituality Lesson 6 Part 1",
        skills: ["Practical Spirituality Lesson 6 Part 1"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Practical Spirituality Lesson 6 Part 2",
        skills: ["Practical Spirituality Lesson 6 Part 2"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      },
      {
        problem: "Practical Spirituality Lesson 7",
        skills: ["Practical Spirituality Lesson 7"],
        skillUrls: ["https://coaching.miteshkhatri.com/"]
      }
    ]
  }
];

export default function LifeSkillsMap() {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "Basic LOA": true,
    "Health Mastery": true,
    "Wealth Mastery": true,
    "NLP": true,
    "Relationship Mastery": true,
    "Lead Self": true,
    "Lead People": true,
    "Train The Trainer": true,
    "Digital Coaching System - Becoming a Digital Millionaire Coach": true,
    "Practical Spirituality": true,
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <Card className="w-full border-2 border-primary/30 dark:border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10" data-testid="card-life-skills-map">
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Life Problems & Life Skill Map
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="border-2 border-primary/20 dark:border-primary/30 rounded-lg overflow-hidden shadow-md">
          {/* Common Table Headers */}
          <div className="sticky top-0 z-20 grid grid-cols-2">
            <div 
              className="bg-[#ff6b6b] dark:bg-[#ff6b6b]/90 text-white font-semibold text-xs sm:text-sm p-2 sm:p-2.5 text-center border-b-2 border-white/20"
              data-testid="header-problems-common"
            >
              Problems
            </div>
            <div 
              className="bg-[#10b981] dark:bg-[#10b981]/90 text-white font-semibold text-xs sm:text-sm p-2 sm:p-2.5 text-center border-b-2 border-white/20"
              data-testid="header-life-skills-common"
            >
              Life Skills
            </div>
          </div>

          {/* Scrollable Content Container */}
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            {/* Category Sections */}
            {lifeSkillsData.map((category, categoryIdx) => (
              <Collapsible 
                key={`category-${categoryIdx}`}
                open={openCategories[category.category]}
                onOpenChange={() => toggleCategory(category.category)}
              >
                {/* Category Header */}
                <CollapsibleTrigger 
                  className="w-full bg-primary/10 dark:bg-primary/20 hover:bg-primary/15 dark:hover:bg-primary/25 transition-colors border-b border-primary/10" 
                  data-testid={`button-toggle-${category.category.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center justify-center gap-2 p-2 sm:p-2.5">
                    <h3 className="font-bold text-sm sm:text-base text-primary dark:text-primary/90 text-center">
                      {category.category}
                    </h3>
                    <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-primary transition-transform duration-200 ${openCategories[category.category] ? 'transform rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  {/* Category Content Table */}
                  <table className="w-full border-collapse">
                    <tbody>
                      {category.mappings.map((mapping, mappingIdx) => (
                        <tr 
                          key={`mapping-${categoryIdx}-${mappingIdx}`}
                          className={mappingIdx % 2 === 0 ? 'bg-white dark:bg-gray-900/50' : 'bg-gray-50 dark:bg-gray-800/50'}
                          data-testid={`row-skill-mapping-${categoryIdx}-${mappingIdx}`}
                        >
                          <td className="w-1/2 p-2 sm:p-2.5 border-b border-gray-200 dark:border-gray-700 align-top">
                            <span className="text-xs sm:text-sm">{mapping.problem}</span>
                          </td>
                          <td className="w-1/2 p-2 sm:p-2.5 border-b border-gray-200 dark:border-gray-700 align-top">
                            <div className="flex flex-col gap-1">
                              {mapping.skills.map((skill, skillIdx) => (
                                <a
                                  key={`skill-${categoryIdx}-${mappingIdx}-${skillIdx}`}
                                  href={mapping.skillUrls?.[skillIdx] || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline text-xs sm:text-sm"
                                  data-testid={`link-skill-${categoryIdx}-${mappingIdx}-${skillIdx}`}
                                >
                                  {skill}
                                </a>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
