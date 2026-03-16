import { EARN_ACTIVITIES, SPEND_ACTIVITIES, PENALTY_ACTIVITIES, NEUTRAL_ACTIVITIES } from './activities';
import { EarnCategory, SpendCategory, PenaltyCategory, NeutralCategory } from '@/types';

const categoryLabelMap: Record<string, string> = {};

for (const [key, value] of Object.entries(EARN_ACTIVITIES)) {
  categoryLabelMap[key] = value.label;
}
for (const [key, value] of Object.entries(SPEND_ACTIVITIES)) {
  categoryLabelMap[key] = value.label;
}
for (const [key, value] of Object.entries(PENALTY_ACTIVITIES)) {
  categoryLabelMap[key] = value.label;
}
for (const [key, value] of Object.entries(NEUTRAL_ACTIVITIES)) {
  categoryLabelMap[key] = value.label;
}

export function getCategoryLabel(category: string): string {
  return categoryLabelMap[category] || category;
}
