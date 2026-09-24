export type BankAchievementId =
  | "goal-setter"
  | "goal-reached"
  | "first-bond"
  | "return-collector"
  | "lab-starter"
  | "money-master";

export type BankAchievement = {
  id: BankAchievementId;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
};

export type BankAchievementSnapshot = {
  achievements: BankAchievement[];
  unlockedCount: number;
  totalCount: number;
};

export const EMPTY_BANK_ACHIEVEMENTS: BankAchievementSnapshot = {
  achievements: [
    {
      id: "goal-setter",
      icon: "◎",
      title: "Goal Setter",
      description: "Create your first Savings Goal.",
      unlocked: false,
    },
    {
      id: "goal-reached",
      icon: "✓",
      title: "Goal Reached",
      description: "Reach a Savings Goal target.",
      unlocked: false,
    },
    {
      id: "first-bond",
      icon: "◆",
      title: "Bond Explorer",
      description: "Buy your first Bank Bond.",
      unlocked: false,
    },
    {
      id: "return-collector",
      icon: "+",
      title: "Return Collector",
      description: "Collect the return from a matured Bond.",
      unlocked: false,
    },
    {
      id: "lab-starter",
      icon: "▦",
      title: "Foundations Starter",
      description: "Complete your first Financial Foundations lesson.",
      unlocked: false,
    },
    {
      id: "money-master",
      icon: "★",
      title: "Foundations Complete",
      description: "Complete all six Financial Foundations lessons.",
      unlocked: false,
    },
  ],
  unlockedCount: 0,
  totalCount: 6,
};
