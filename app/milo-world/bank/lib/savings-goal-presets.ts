import type { SavingsGoalLinkedType } from "./savings-types";

export type SavingsGoalPurpose = {
  type: SavingsGoalLinkedType;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
};

export const SAVINGS_GOAL_PURPOSES: SavingsGoalPurpose[] = [
  {
    type: "custom",
    label: "My Own Goal",
    shortLabel: "Custom",
    icon: "🎯",
    description: "Save towards anything you choose.",
  },
  {
    type: "rover",
    label: "Rover",
    shortLabel: "Rover",
    icon: "🚀",
    description: "Set DT aside for a rover or rover build.",
  },
  {
    type: "property",
    label: "Property",
    shortLabel: "Property",
    icon: "🏠",
    description: "Plan ahead for a property in Milo’s Exchange.",
  },
  {
    type: "upgrade",
    label: "Upgrade",
    shortLabel: "Upgrade",
    icon: "⚙️",
    description: "Save for an upgrade somewhere in Dreamscape.",
  },
  {
    type: "business",
    label: "Business",
    shortLabel: "Business",
    icon: "💡",
    description: "Build capital for Milo’s Business Builder.",
  },
];

export function getSavingsGoalPurpose(type: SavingsGoalLinkedType) {
  return (
    SAVINGS_GOAL_PURPOSES.find((purpose) => purpose.type === type) ??
    SAVINGS_GOAL_PURPOSES[0]
  );
}
