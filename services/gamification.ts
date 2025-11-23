
import { Badge, UserStats, LeaderboardEntry } from "../types";

export const BADGES: Badge[] = [
  {
    id: "beginner",
    name: "初级专注者",
    description: "专注时长达到 1 分钟",
    icon: "🥉",
    unlocked: false,
    condition: (stats) => stats.totalFocusTimeSeconds >= 60,
  },
  {
    id: "streak_master",
    name: "连胜大师",
    description: "连续专注超过 5 分钟",
    icon: "🔥",
    unlocked: false,
    condition: (stats) => stats.longestStreakSeconds >= 300,
  },
  {
    id: "scholar",
    name: "小小学者",
    description: "总专注时长达到 20 分钟",
    icon: "🎓",
    unlocked: false,
    condition: (stats) => stats.totalFocusTimeSeconds >= 1200,
  },
  {
    id: "iron_will",
    name: "钢铁意志",
    description: "即使分心也能快速调整 (分心次数 > 5 但总时长 > 10m)",
    icon: "🛡️",
    unlocked: false,
    condition: (stats) => stats.distractionCount > 5 && stats.totalFocusTimeSeconds >= 600,
  }
];

export const calculateDailyScore = (stats: UserStats): number => {
  // Simple algorithm: Focus time vs Distractions.
  // Base 50, +1 per minute focused, -2 per distraction. Max 100, Min 0.
  const minutes = Math.floor(stats.totalFocusTimeSeconds / 60);
  let score = 50 + (minutes * 2) - (stats.distractionCount * 2);
  return Math.min(100, Math.max(0, score));
};

export const getLeaderboard = (currentUserScore: number): LeaderboardEntry[] => {
  const mockData: LeaderboardEntry[] = [
    { id: "1", name: "隔壁小明", score: 92, avatar: "👦", isCurrentUser: false },
    { id: "2", name: "学习委员", score: 88, avatar: "👧", isCurrentUser: false },
    { id: "3", name: "我", score: currentUserScore, avatar: "😎", isCurrentUser: true },
    { id: "4", name: "捣蛋鬼", score: 45, avatar: "🤪", isCurrentUser: false },
  ];
  return mockData.sort((a, b) => b.score - a.score);
};

export const checkBadges = (stats: UserStats, currentBadges: string[]): Badge | null => {
  for (const badge of BADGES) {
    if (!currentBadges.includes(badge.id)) {
      if (badge.condition(stats)) {
        return badge;
      }
    }
  }
  return null;
};
