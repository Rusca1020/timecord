import { EARN_ACTIVITIES, SPEND_ACTIVITIES, PENALTY_ACTIVITIES, NEUTRAL_ACTIVITIES } from './activities';
import { EarnCategory, SpendCategory, PenaltyCategory, NeutralCategory } from '@/types';
import { useStore } from '@/store/useStore';

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
  // 기본 카테고리에서 찾기
  if (categoryLabelMap[category]) {
    return categoryLabelMap[category];
  }

  // 커스텀 활동에서 찾기 (custom_{uuid} 형태)
  if (category.startsWith('custom_')) {
    const customId = category.replace('custom_', '');
    const customActivities = useStore.getState().customActivities;
    const custom = customActivities.find(a => a.id === customId);
    if (custom) return custom.label;
  }

  return category;
}
