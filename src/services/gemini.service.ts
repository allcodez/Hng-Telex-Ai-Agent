import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProgrammingLanguage, UserChallenge } from '../types/user-state.types';

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    async generateDailyChallenge(language: ProgrammingLanguage): Promise<UserChallenge> {
        const prompt = this.buildDailyChallengePrompt(language);

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parse JSON response
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                const challengeData = JSON.parse(jsonMatch[1]);
                return {
                    id: `challenge_${Date.now()}`,
                    title: challengeData.title,
                    question: challengeData.question,
                    correctAnswer: challengeData.answer,
                    hints: challengeData.hints,
                    language,
                    createdAt: new Date(),
                    attempts: 0,
                    solved: false
                };
            }

            throw new Error('Failed to parse challenge from AI response');
        } catch (error) {
            console.error('Error generating daily challenge:', error);
            throw error;
        }
    }

    private buildDailyChallengePrompt(language: ProgrammingLanguage): string {
        return `Generate ONE simple, daily coding challenge for ${language}.

CRITICAL REQUIREMENTS:
- Question must be SHORT (2-3 sentences max)
- Answer must be SHORT (1 line of code or single word/phrase)
- Hints must be SHORT (1 sentence each)
- Difficulty: EASY - a beginner should solve it in 1-2 minutes
- Focus on basic syntax, simple logic, or fundamental concepts
- NO complex algorithms, NO multiple steps

Examples of GOOD challenges:
- "What's the correct syntax to print 'Hello' in ${language}?"
- "How do you create an empty list/array in ${language}?"
- "What operator checks if two values are equal?"
- "What's the keyword to define a function in ${language}?"

Return ONLY valid JSON in this EXACT format:
\`\`\`json
{
  "title": "Short catchy title (max 5 words)",
  "question": "Clear, simple question that can be answered in one line",
  "answer": "The correct answer (one line of code or simple phrase)",
  "hints": [
    "First hint: gentle nudge",
    "Second hint: more specific",
    "Third hint: almost gives it away"
  ]
}
\`\`\`

Generate the challenge now.`;
    }
}