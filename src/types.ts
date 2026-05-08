export interface JournalEntry {
  id: string;
  date: string; // ISO string for local day (YYYY-MM-DD)
  text: string;
  year: number;
  month: number;
  day: number;
  createdAt: number;
}

export interface UserPreferences {
  background: string;
  isCustomBackground: boolean;
  name: string;
}

export const CHARACTER_LIMIT = 200;
