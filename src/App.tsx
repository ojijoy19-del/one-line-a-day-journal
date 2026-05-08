/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { format, subYears, isSameDay, parseISO, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  History, 
  Search, 
  Settings as SettingsIcon, 
  Plus, 
  Share2, 
  TrendingUp,
  Download,
  Book,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { JournalEntry, UserPreferences, CHARACTER_LIMIT } from './types';
import { fetchEntries, upsertEntry, getUserPrefs, saveUserPrefs } from './lib/storage';

type View = 'daily' | 'timeline' | 'search' | 'stats' | 'settings' | 'review';

export default function App() {
  const [view, setView] = useState<View>('daily');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences>(getUserPrefs());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsSyncing(true);
      const data = await fetchEntries();
      setEntries(data);
      setIsSyncing(false);
    };
    load();
  }, []);

  const todayEntry = useMemo(() => {
    const dStr = currentDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
    return entries.find(e => e.date === dStr);
  }, [entries, currentDate]);

  useEffect(() => {
    if (todayEntry) {
      setInputText(todayEntry.text);
    } else {
      setInputText('');
    }
  }, [todayEntry, currentDate]);

  const pastEntries = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const year = i + 1;
      const targetDate = subYears(currentDate, year);
      const targetDateStr = targetDate.toLocaleDateString('en-CA');
      return {
        year: year,
        actualYear: targetDate.getFullYear(),
        entry: entries.find(e => e.date === targetDateStr),
      };
    });
  }, [entries, currentDate]);

  const streak = useMemo(() => {
    if (entries.length === 0) return 0;
    const sorted = [...entries].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    let count = 0;
    let lastDate = new Date();
    lastDate.setHours(0,0,0,0);
    
    // Check if the most recent entry is today or yesterday
    const latestEntryDate = parseISO(sorted[0].date);
    const dayDiff = differenceInDays(lastDate, latestEntryDate);
    
    if (dayDiff > 1) return 0;

    let currentRef = latestEntryDate;
    count = 1;

    for (let i = 1; i < sorted.length; i++) {
      const prevEntryDate = parseISO(sorted[i].date);
      if (differenceInDays(currentRef, prevEntryDate) === 1) {
        count++;
        currentRef = prevEntryDate;
      } else {
        break;
      }
    }
    return count;
  }, [entries]);

  const handleSave = async () => {
    if (!inputText.trim()) return;
    setIsSyncing(true);
    const saved = await upsertEntry(inputText, currentDate);
    if (saved) {
      const data = await fetchEntries();
      setEntries(data);
    }
    setIsSyncing(false);
  };

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries;
    return entries.filter(e => 
      e.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.date.includes(searchQuery)
    ).sort((a, b) => b.createdAt - a.createdAt);
  }, [entries, searchQuery]);

  const exportPDF = () => {
    alert("Simulating PDF Export... Your 5-year journal is being formatted into a book-style layout.");
  };

  return (
    <div className={`min-h-screen ${prefs.background} flex flex-col font-sans transition-all duration-700`}>
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/40 backdrop-blur-xl border-t border-white/20 px-6 py-4 z-50 md:top-0 md:bottom-auto md:border-t-0 md:border-b">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <NavItem icon={<Calendar size={20} />} active={view === 'daily'} onClick={() => setView('daily')} label="Today" />
          <NavItem icon={<History size={20} />} active={view === 'timeline'} onClick={() => setView('timeline')} label="History" />
          <NavItem icon={<Search size={20} />} active={view === 'search'} onClick={() => setView('search')} label="Search" />
          <NavItem icon={<TrendingUp size={20} />} active={view === 'stats'} onClick={() => setView('stats')} label="Stats" />
          <NavItem icon={<SettingsIcon size={20} />} active={view === 'settings'} onClick={() => setView('settings')} label="Settings" />
        </div>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-12 pb-32 md:pt-40">
        <AnimatePresence mode="wait">
          {view === 'daily' && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-16"
            >
              {/* Date Selector */}
              <div className="flex justify-between items-center bg-white/20 p-2 rounded-full backdrop-blur-sm shadow-sm border border-white/20">
                <button onClick={() => setCurrentDate(d => {
                  const next = new Date(d);
                  next.setDate(d.getDate() - 1);
                  return next;
                })} className="p-3 hover:bg-white/40 rounded-full transition-all">
                  <ChevronLeft size={20} className="text-slate-600" />
                </button>
                <div className="text-center px-4 relative">
                  <h1 className="text-3xl font-serif font-semibold tracking-tight text-slate-800">{format(currentDate, 'MMMM do')}</h1>
                  <p className="text-slate-500 font-medium uppercase tracking-[0.3em] text-[9px] mt-1">{format(currentDate, 'EEEE, yyyy')}</p>
                  {isSyncing && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute -right-8 top-1/2 -translate-y-1/2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                    </motion.div>
                  )}
                </div>
                <button onClick={() => setCurrentDate(d => {
                  const next = new Date(d);
                  next.setDate(d.getDate() + 1);
                  return next;
                })} className="p-3 hover:bg-white/40 rounded-full transition-all">
                  <ChevronRight size={20} className="text-slate-600" />
                </button>
              </div>

              {/* Editor */}
              <div className="space-y-6">
                <div className="relative group">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value.slice(0, CHARACTER_LIMIT))}
                    placeholder="Capture your day in one line..."
                    className="w-full h-40 bg-transparent text-2xl font-serif italic leading-loose border-none focus:ring-0 placeholder:text-slate-300 resize-none text-slate-700 selection:bg-slate-200"
                    id="daily-input"
                  />
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100/50">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 bg-slate-100/50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(inputText.length / CHARACTER_LIMIT) * 100}%` }}
                          className={`h-full ${inputText.length > CHARACTER_LIMIT * 0.9 ? 'bg-orange-400' : 'bg-slate-400'}`}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                        {inputText.length} / {CHARACTER_LIMIT}
                      </span>
                    </div>
                    <button 
                      onClick={handleSave}
                      disabled={inputText.length === 0 || todayEntry?.text === inputText}
                      className="px-8 py-3 bg-slate-900 text-white rounded-full text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-slate-800 hover:scale-105 disabled:opacity-20 disabled:scale-100 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                    >
                      {todayEntry ? 'Remembered' : 'Capture'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Past Years */}
              <div className="space-y-12">
                <div className="flex items-center gap-4">
                   <div className="h-px flex-1 bg-slate-200/50" />
                   <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Chronicles of Past {format(currentDate, 'MMM d')}</h2>
                   <div className="h-px flex-1 bg-slate-200/50" />
                </div>
                
                <div className="space-y-12 pl-4">
                  {pastEntries.map(({ year, actualYear, entry }, index) => (
                    <motion.div 
                      key={year} 
                      className="group relative"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="absolute -left-6 top-1.5 bottom-[-48px] w-[1px] bg-slate-100 group-last:bg-transparent" />
                      <div className="absolute -left-[27.5px] top-1.5 w-1.5 h-1.5 rounded-full border border-slate-200 bg-white" />
                      
                      <div className="flex gap-8 items-start">
                        <div className="flex-shrink-0 w-20">
                          <span className="text-2xl font-serif font-black text-slate-200 group-hover:text-slate-300 transition-colors">{year}</span>
                          <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-tighter mt-1 opacity-60">Year{year > 1 ? 's' : ''} Pre.</span>
                        </div>
                        <div className="flex-1 pt-1">
                          {entry ? (
                            <p className="text-xl font-serif italic text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">
                              "{entry.text}"
                            </p>
                          ) : (
                            <p className="text-slate-300 font-serif italic text-base">The ink did not touch the page this day.</p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                             <div className="w-4 h-[1px] bg-slate-100" />
                             <p className="text-[9px] text-slate-400 font-mono tracking-widest">{actualYear}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <header className="flex justify-between items-end border-b border-slate-100 pb-8">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-slate-800">The Journey</h1>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-[0.2em] font-medium">A total of {entries.length} reflections</p>
                </div>
                <button 
                  onClick={exportPDF} 
                  className="group flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-slate-900 px-6 py-3 bg-white border border-slate-100 rounded-full hover:border-slate-300 shadow-sm transition-all active:scale-95"
                >
                  <Download size={14} className="group-hover:translate-y-0.5 transition-transform" /> 
                  Export PDF
                </button>
              </header>

              <div className="space-y-16">
                {[...entries].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map((entry, i) => (
                  <motion.div 
                    key={entry.id} 
                    className="relative pl-12 group"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <div className="absolute left-0 top-2.5 w-3 h-3 rounded-full border-2 border-slate-200 bg-white group-hover:bg-slate-900 group-hover:border-slate-900 transition-all duration-500" />
                    {i !== entries.length - 1 && <div className="absolute left-[5.5px] top-6 bottom-[-64px] w-[1px] bg-slate-100" />}
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.3em]">
                          {format(parseISO(entry.date), 'EEEE')}
                        </p>
                        <div className="h-px flex-1 bg-slate-50" />
                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                          {format(parseISO(entry.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <p className="text-2xl font-serif italic text-slate-800 leading-relaxed">
                        {entry.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {entries.length === 0 && (
                  <div className="text-center py-32 opacity-40">
                    <Book className="mx-auto text-slate-300 mb-6" size={64} strokeWidth={1} />
                    <p className="text-xl font-serif italic text-slate-400">Your story waits to be told.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Traverse through memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/50 backdrop-blur-sm border border-slate-100 rounded-3xl py-6 pl-16 pr-8 text-xl font-serif italic focus:ring-4 focus:ring-slate-100/50 focus:border-slate-200 transition-all outline-none shadow-sm placeholder:text-slate-300"
                />
              </div>

              <div className="space-y-8">
                {filteredEntries.map(entry => (
                  <motion.div 
                    key={entry.id} 
                    layout
                    className="bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:border-slate-200/50 hover:bg-white/60 transition-all group cursor-pointer"
                    onClick={() => { setCurrentDate(parseISO(entry.date)); setView('daily'); }}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <p className="text-[9px] font-mono text-slate-400 uppercase tracking-[0.4em]">
                        {format(parseISO(entry.date), 'MMMM do, yyyy')}
                      </p>
                      <button className="opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest">Return to Date</button>
                    </div>
                    <p className="text-2xl font-serif italic text-slate-700 group-hover:text-slate-900 leading-relaxed transition-colors">
                      {entry.text}
                    </p>
                  </motion.div>
                ))}
                {filteredEntries.length === 0 && searchQuery && (
                  <div className="text-center py-20">
                     <p className="text-lg font-serif italic text-slate-300 italic">No echoes of that memory found in the silence.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-16"
            >
              <div className="text-center py-12 relative">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-block relative"
                >
                   <div className="absolute -inset-10 bg-gradient-to-tr from-orange-100 to-amber-50 rounded-full blur-3xl opacity-60 animate-pulse" />
                   <div className="relative bg-white/40 p-8 rounded-full border border-white/40 shadow-xl backdrop-blur-md">
                      <TrendingUp className="text-orange-500" size={48} strokeWidth={1.5} />
                   </div>
                </motion.div>
                
                <div className="mt-12 space-y-2">
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] text-slate-400">Current Streak</h2>
                  <div className="text-8xl font-serif font-black tracking-tighter text-slate-900">{streak}</div>
                  <p className="text-sm font-medium text-slate-400 mt-4 italic max-w-xs mx-auto">“A single line is the weight of a world.”</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <StatCard label="Eternal Moments" value={entries.length} sub="Captured life" />
                <StatCard label="Journal Age" value={`${Math.ceil(entries.length / 365 * 100)}%`} sub="Of Year One" />
              </div>

              <div className="bg-white/40 backdrop-blur-md p-10 rounded-3xl border border-white/20 space-y-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Year One Highlights</h3>
                  <Share2 size={16} className="text-slate-300" />
                </div>
                
                {entries.length > 0 ? (
                  <div className="space-y-10">
                    {entries.slice(0, 3).map(e => (
                      <div key={e.id} className="group relative">
                        <div className="absolute -left-4 top-1 bottom-1 w-[2px] bg-slate-100 group-hover:bg-slate-900 transition-all" />
                        <p className="text-xl font-serif italic text-slate-600 group-hover:text-slate-900 transition-colors leading-snug">"{e.text}"</p>
                        <p className="text-[9px] text-slate-400 mt-3 font-mono uppercase tracking-widest">{format(parseISO(e.date), 'MMMM d, yyyy')}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-lg font-serif italic text-slate-300 text-center py-6">Your best lines will echo here.</p>
                )}
                
                <button onClick={() => setView('timeline')} className="w-full py-4 border border-slate-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-white/60 hover:text-slate-900 transition-all">Review Full Archive</button>
              </div>
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <h1 className="text-3xl font-serif font-bold text-slate-800">Atmosphere</h1>
              
              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Identify as</label>
                  <input
                    type="text"
                    value={prefs.name}
                    onChange={(e) => {
                      const newPrefs = { ...prefs, name: e.target.value };
                      setPrefs(newPrefs);
                      saveUserPrefs(newPrefs);
                    }}
                    className="w-full bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl p-6 text-lg font-medium outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-6">
                   <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Atmosphere</label>
                   <div className="grid grid-cols-2 gap-4">
                      <BgOption 
                        label="Linen" 
                        active={prefs.background === 'journal-bg-gradient'} 
                        className="journal-bg-gradient" 
                        onClick={() => {
                          const newPrefs = { ...prefs, background: 'journal-bg-gradient' };
                          setPrefs(newPrefs);
                          saveUserPrefs(newPrefs);
                        }}
                      />
                      <BgOption 
                        label="Aurora" 
                        active={prefs.background === 'bg-aurora'} 
                        className="bg-aurora" 
                        onClick={() => {
                          const newPrefs = { ...prefs, background: 'bg-aurora' };
                          setPrefs(newPrefs);
                          saveUserPrefs(newPrefs);
                        }}
                      />
                       <BgOption 
                        label="Mist" 
                        active={prefs.background === 'bg-mist'} 
                        className="bg-mist" 
                        onClick={() => {
                          const newPrefs = { ...prefs, background: 'bg-mist' };
                          setPrefs(newPrefs);
                          saveUserPrefs(newPrefs);
                        }}
                      />
                       <BgOption 
                        label="Midnight" 
                        active={prefs.background.includes('bg-midnight')} 
                        className="bg-midnight" 
                        onClick={() => {
                          const newPrefs = { ...prefs, background: 'bg-midnight text-slate-400 selection:bg-slate-800' };
                          setPrefs(newPrefs);
                          saveUserPrefs(newPrefs);
                        }}
                      />
                   </div>
                </div>

                <div className="pt-8 space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Danger Zone</label>
                  <button 
                    onClick={() => {
                      if (confirm("Are you sure you want to erase all memories? This cannot be undone.")) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="w-full py-4 border border-red-100 text-red-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all"
                  >
                    Reset Journal
                  </button>
                </div>

                <div className="pt-8 border-t border-slate-100/50">
                   <div className="bg-slate-900 p-8 rounded-3xl text-white space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 italic">Curated Design</h4>
                      <p className="text-lg font-serif">"The simplicity of one line a day brings clarity to the noise of a lifetime."</p>
                      <Share2 className="text-slate-700" size={24} />
                   </div>
                </div>
              </div>

              <div className="pt-12 text-center">
                <p className="text-[10px] text-slate-300 uppercase tracking-[0.5em] mb-3 font-mono">One Line a Day v1.0</p>
                <div className="h-px w-20 bg-slate-100 mx-auto mb-3" />
                <p className="text-[9px] text-slate-400 max-w-[200px] mx-auto italic">Crafted for long-term satisfaction and daily reflection.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, active, onClick, label }: { icon: React.ReactNode, active: boolean, onClick: () => void, label: string }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group shrink-0">
      <div className={`p-3 rounded-2xl transition-all duration-500 ${active ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-110' : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-white/60 group-hover:scale-105'}`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${active ? 'opacity-100 text-slate-900 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 text-slate-400'}`}>
        {label}
      </span>
    </button>
  );
}

function StatCard({ label, value, sub }: { label: string, value: string | number, sub: string }) {
  return (
    <div className="bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/40 shadow-sm hover:shadow-md transition-shadow">
      <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-400 block mb-1">{label}</span>
      <div className="text-3xl font-serif font-black text-slate-800">{value}</div>
      <div className="mt-3 flex items-center gap-2">
         <div className="w-2 h-[1px] bg-slate-200" />
         <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">{sub}</p>
      </div>
    </div>
  );
}

function BgOption({ label, active, onClick, className }: { label: string, active: boolean, onClick: () => void, className: string }) {
  return (
    <button 
      onClick={onClick}
      className={`relative h-24 rounded-2xl border-2 transition-all p-4 text-left overflow-hidden group shadow-sm ${active ? 'border-slate-900 ring-4 ring-slate-100 scale-95' : 'border-white hover:border-slate-100 hover:scale-[1.02]'}`}
    >
      <div className={`absolute inset-0 ${className} -z-10 transition-transform group-hover:scale-110 duration-700`} />
      <div className="flex flex-col justify-between h-full">
        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${active ? 'text-slate-900' : 'text-slate-400 opacity-60'}`}>{label}</span>
        {active && (
          <motion.div 
            layoutId="bg-marker"
            className="w-1.5 h-1.5 rounded-full bg-slate-900" 
          />
        )}
      </div>
    </button>
  );
}

