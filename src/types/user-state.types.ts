export type ProgrammingLanguage =
    | 'python'
    | 'javascript'
    | 'typescript'
    | 'java'
    | 'cpp'
    | 'csharp'
    | 'go'
    | 'rust';

export interface UserChallenge {
    id: string;
    title: string;
    question: string;
    correctAnswer: string;
    hints: string[];
    language: ProgrammingLanguage;
    createdAt: Date;
    attempts: number;
    solved: boolean;
}

export interface UserState {
    userId: string;
    preferredLanguage: ProgrammingLanguage;
    currentChallenge: UserChallenge | null;
    lastChallengeDate: string; // YYYY-MM-DD format
    score: number;
    streak: number;
}

export interface ChallengeResponse {
    challenge: UserChallenge;
    joke: string;
    greeting: string;
}