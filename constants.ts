
export const LETTERS = ['A', 'E', 'İ', 'O', 'U', 'C', 'T', 'S', 'Y'];

export const COLORS = [
  '#ef4444', // Red 500
  '#3b82f6', // Blue 500
  '#22c55e', // Green 500
  '#eab308', // Yellow 500
  '#a855f7', // Purple 500
  '#f97316', // Orange 500
  '#06b6d4', // Cyan 500
  '#ec4899', // Pink 500
  '#f8fafc', // Slate 50 (White-ish)
];

export const SPEED_SETTINGS: Record<string, number> = {
  slow: 3500,
  normal: 2500,
  fast: 1500,
};

export const STIMULUS_DURATION = 500;

export const getSequenceLength = (level: number, isPractice: boolean): number => {
  if (isPractice) return 1000;
  if (level === 1) return 21;
  if (level === 2) return 25;
  return 30;
};

export const PHONETIC_MAP: Record<string, string> = {
  'A': 'aa',
  'E': 'eee',
  'İ': 'iii',
  'O': 'oo',
  'U': 'uu',
  'C': 'cee',
  'T': 'tee',
  'S': 'seee',
  'Y': 'yee'
};

export const RANKS = [
  { minXp: 0, name: 'Çömez' },
  { minXp: 500, name: 'Odak Stajyeri' },
  { minXp: 1500, name: 'Zihin Mimarı' },
  { minXp: 4000, name: 'Hafıza Ustası' },
  { minXp: 10000, name: 'Nöro Grandmaster' }
];

export const XP_MULTIPLIERS = {
  position: 1,
  dual: 1.5,
  triple: 2.2,
  fast: 1.3,
  normal: 1,
  slow: 0.7
};
