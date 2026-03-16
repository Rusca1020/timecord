import { Platform } from 'react-native';
import { Activity } from '@/types';
import { getCategoryLabel } from '@/constants/categoryNames';
import { ACTIVITY_TYPE_LABELS } from '@/constants/activities';

const BOM = '\uFEFF';

export function activitiesToCSV(activities: Activity[]): string {
  const header = ['날짜', '유형', '카테고리', '시간(h)', '배수', '반영시간(h)', '승인', '메모'];
  const rows = activities.map((a) => [
    a.date,
    ACTIVITY_TYPE_LABELS[a.type] || a.type,
    getCategoryLabel(a.category),
    a.duration.toString(),
    a.multiplier.toString(),
    a.earnedTime.toFixed(1),
    a.approved ? 'O' : 'X',
    (a.description || '').replace(/"/g, '""'),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  return BOM + csv;
}

export async function exportActivitiesAsCSV(activities: Activity[]): Promise<void> {
  if (Platform.OS === 'web') {
    // 웹: Blob 다운로드
    const csv = activitiesToCSV(activities);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timecord_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // 네이티브: expo-file-system + expo-sharing
  const FileSystem = require('expo-file-system');
  const Sharing = require('expo-sharing');

  const csv = activitiesToCSV(activities);
  const fileName = `timecord_${new Date().toISOString().split('T')[0]}.csv`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: '활동 내역 내보내기',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
