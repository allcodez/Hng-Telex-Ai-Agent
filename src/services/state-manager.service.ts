import { UserState, ProgrammingLanguage, UserChallenge } from '../types/user-state.types';

export class StateManager {
    private states: Map<string, UserState> = new Map();

    getUserState(userId: string): UserState {
        if (!this.states.has(userId)) {
            this.states.set(userId, this.createDefaultState(userId));
        }
        return this.states.get(userId)!;
    }

    updateUserState(userId: string, updates: Partial<UserState>): UserState {
        const currentState = this.getUserState(userId);
        const newState = { ...currentState, ...updates };
        this.states.set(userId, newState);
        return newState;
    }

    setPreferredLanguage(userId: string, language: ProgrammingLanguage): UserState {
        return this.updateUserState(userId, { preferredLanguage: language });
    }

    setCurrentChallenge(userId: string, challenge: UserChallenge): UserState {
        const today = new Date().toISOString().split('T')[0];
        return this.updateUserState(userId, {
            currentChallenge: challenge,
            lastChallengeDate: today
        });
    }

    incrementAttempts(userId: string): UserChallenge | null {
        const state = this.getUserState(userId);
        if (!state.currentChallenge) return null;

        const challenge = { ...state.currentChallenge, attempts: state.currentChallenge.attempts + 1 };
        this.updateUserState(userId, { currentChallenge: challenge });
        return challenge;
    }

    markChallengeSolved(userId: string): UserState {
        const state = this.getUserState(userId);
        if (!state.currentChallenge) return state;

        const challenge = { ...state.currentChallenge, solved: true };
        return this.updateUserState(userId, {
            currentChallenge: challenge,
            score: state.score + 1,
            streak: state.streak + 1
        });
    }

    needsNewChallenge(userId: string): boolean {
        const state = this.getUserState(userId);
        const today = new Date().toISOString().split('T')[0];

        return !state.currentChallenge ||
            state.currentChallenge.solved ||
            state.lastChallengeDate !== today;
    }

    private createDefaultState(userId: string): UserState {
        return {
            userId,
            preferredLanguage: 'python',
            currentChallenge: null,
            lastChallengeDate: '',
            score: 0,
            streak: 0
        };
    }
}

// Singleton instance
export const stateManager = new StateManager();