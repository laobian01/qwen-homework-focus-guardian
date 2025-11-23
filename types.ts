export enum FocusStatus {
  IDLE = 'IDLE',
  FOCUSED = 'FOCUSED',
  DISTRACTED = 'DISTRACTED',
  ABSENT = 'ABSENT',
  ERROR = 'ERROR'
}

export interface AnalysisResult {
  status: FocusStatus;
  message: string;
  confidence: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  status: FocusStatus;
  message: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon name
  unlocked: boolean;
  condition: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalFocusTimeSeconds: number;
  currentStreakSeconds: number;
  longestStreakSeconds: number;
  distractionCount: number;
  badges: string[]; // IDs of unlocked badges
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number; // 0-100 focus score
  avatar: string;
  isCurrentUser: boolean;
}
