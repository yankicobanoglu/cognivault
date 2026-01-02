
export type GameMode = 'position' | 'dual' | 'triple';
export type GameState = 'idle' | 'playing' | 'finished' | 'analytics';
export type GameSpeed = 'slow' | 'normal' | 'fast';

export interface Stimulus {
  position: number;
  sound: string;
  color: string;
}

export interface ModalityScore {
  correct: number;
  missed: number;
  falseAlarms: number;
  totalPossible: number;
}

export interface ScoreDetails {
  position: ModalityScore;
  sound: ModalityScore;
  color: ModalityScore;
  overall: {
    percentage: number;
    totalCorrect: number;
    totalMissed: number;
    totalFalseAlarms: number;
  };
}

export interface SessionRecord {
  id: string;
  date: number;
  level: number;
  mode: GameMode;
  score: number;
  xpEarned: number;
  details: ScoreDetails;
  reactionTimes: number[];
  isDaily: boolean;
}

export interface ButtonFeedback {
  position: boolean;
  sound: boolean;
  color: boolean;
}

export type TutorialStep = 
  | 'welcome' 
  | 'nback_logic' 
  | 'interactive_intro'
  | 'demo_step_1' 
  | 'demo_step_2' 
  | 'demo_step_3'
  | 'ready';

export interface UserStats {
  xp: number;
  streak: number;
  lastPlayed: number;
  rank: string;
  bestN: number;
}
