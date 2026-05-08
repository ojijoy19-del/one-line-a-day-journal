import { getSupabase } from './supabase';
import { JournalEntry, UserPreferences } from '../types';

const STORAGE_KEYS = {
  PREFS: 'user_preferences',
};

// Check if Supabase is actually configured
const isSupabaseConfigured = () => {
  return !!getSupabase();
};

// Get or create an anonymous unique ID for this browser
const getJournalId = () => {
  let id = localStorage.getItem('anonymous_journal_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('anonymous_journal_id', id);
  }
  return id;
};

export const fetchEntries = async (): Promise<JournalEntry[]> => {
  const supabase = getSupabase();
  if (!supabase) {
    const data = localStorage.getItem('journal_entries');
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('journal_id', getJournalId())
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching from Supabase:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    date: row.date,
    text: row.text,
    year: row.year,
    month: row.month,
    day: row.day,
    createdAt: new Date(row.created_at).getTime(),
  }));
};

export const upsertEntry = async (text: string, date: Date): Promise<JournalEntry | null> => {
  const dateStr = date.toISOString().split('T')[0];
  const payload = {
    date: dateStr,
    text,
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };

  const supabase = getSupabase();
  if (!supabase) {
    const data = localStorage.getItem('journal_entries');
    const entries: JournalEntry[] = data ? JSON.parse(data) : [];
    const index = entries.findIndex(e => e.date === dateStr);
    
    const newEntry: JournalEntry = {
      id: index !== -1 ? entries[index].id : crypto.randomUUID(),
      ...payload,
      createdAt: index !== -1 ? entries[index].createdAt : Date.now(),
    };

    if (index !== -1) entries[index] = newEntry;
    else entries.push(newEntry);
    
    localStorage.setItem('journal_entries', JSON.stringify(entries));
    return newEntry;
  }

  const { data, error } = await supabase
    .from('journal_entries')
    .upsert({ 
      ...payload, 
      journal_id: getJournalId() 
    }, {
      onConflict: 'journal_id,date'
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving to Supabase:', error);
    return null;
  }

  return {
    id: data.id,
    date: data.date,
    text: data.text,
    year: data.year,
    month: data.month,
    day: data.day,
    createdAt: new Date(data.created_at).getTime(),
  };
};

export const getUserPrefs = (): UserPreferences => {
  const data = localStorage.getItem(STORAGE_KEYS.PREFS);
  return data ? JSON.parse(data) : {
    background: 'journal-bg-gradient',
    isCustomBackground: false,
    name: 'Friend',
  };
};

export const saveUserPrefs = (prefs: UserPreferences) => {
  localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs));
};
