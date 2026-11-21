import { mdiHomeOutline, mdiBookOpenPageVariantOutline, mdiRepeat, mdiFormatListBulleted, mdiChartBar } from '@mdi/js';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from './components/ui';
import { dayKey } from './lib/date';
import { dueIds, ensurePlan, getState, isLoaded, learnedDays, useApp, type LearnedDay } from './lib/store';
import { shuffle } from './lib/quiz';
import Home from './screens/Home';
import Learn, { type LearnView } from './screens/Learn';
import Replay from './screens/Replay';
import Quiz, { type SessionConfig } from './screens/Quiz';
import Review from './screens/Review';
import Settings from './screens/Settings';
import Stats from './screens/Stats';
import Words from './screens/Words';

export type Tab = 'home' | 'learn' | 'review' | 'words' | 'stats';
const TABS: [Tab, string, string][] = [
  ['home', 'Ana Sayfa', mdiHomeOutline], ['learn', 'Öğren', mdiBookOpenPageVariantOutline], ['review', 'Tekrar', mdiRepeat],
  ['words', 'Kelimelerim', mdiFormatListBulleted], ['stats', 'İstatistik', mdiChartBar],
];
const readHash = (): Tab => { const h = location.hash.slice(1) as Tab; return TABS.some(t => t[0] === h) ? h : 'home'; };

export default function App() {
  const s = useApp();
  const [tab, setTab] = useState<Tab>(readHash);
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [learnView, setLearnView] = useState<LearnView>('today');
  const [replay, setReplay] = useState<LearnedDay | null>(null);
  const [replayFrom, setReplayFrom] = useState<Tab>('learn');

  useEffect(() => { const f = () => setTab(readHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  useEffect(() => { if (isLoaded()) ensurePlan(); }, [s.plan.date]);
  useEffect(() => { // gün değişimini yakala (uygulama açık kalırsa)
    const f = () => { if (document.visibilityState === 'visible' && getState().plan.date !== dayKey()) ensurePlan(); };
    document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f);
  }, []);
  useEffect(() => { // tema
    const root = document.documentElement;
    if (s.settings.theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', s.settings.theme);
  }, [s.settings.theme]);

  const go = useCallback((t: Tab) => { setSession(null); setReplay(null); if (location.hash !== '#' + t) location.hash = t; setTab(t); window.scrollTo(0, 0); }, []);
  const start = useCallback((c: SessionConfig) => { setReplay(null); setSession(c); if (location.hash !== '#review') location.hash = 'review'; setTab('review'); window.scrollTo(0, 0); }, []);

  /** Günün testi: bugün öğrenilen kelimeler + bekleyen tekrarlar; yoksa karışık pratik. */
  const startDailyTest = useCallback(() => {
    const st = getState(); const t = dayKey();
    const todays = Object.keys(st.progress).filter(id => st.progress[id].firstSeen === t);
    const due = dueIds(st).filter(id => !todays.includes(id));
    let ids = [...shuffle(todays), ...due].slice(0, 20);
    if (ids.length < 5) ids = [...ids, ...shuffle(Object.keys(st.progress).filter(id => !ids.includes(id)))].slice(0, 10);
    start({ ids: shuffle(ids), mode: 'mixed', title: 'Günün testi', daily: true });
  }, [start]);

  const openReplay = useCallback((d: LearnedDay, from: Tab = 'learn') => { setSession(null); setReplay(d); setReplayFrom(from); if (location.hash !== '#learn') location.hash = 'learn'; setTab('learn'); window.scrollTo(0, 0); }, []);
  const replayToday = useCallback(() => { const d = learnedDays(getState()).find(x => x.date === dayKey()); if (d) openReplay(d, 'home'); }, [openReplay]);
  const dayTest = useCallback((d: LearnedDay) => start({ ids: shuffle(d.ids), mode: 'mixed', title: `${d.n}. Gün testi` }), [start]);
  const showDays = useCallback(() => { setLearnView('days'); go('learn'); }, [go]);

  return (
    <div className="app">
      <main>
        {session && tab === 'review'
          ? <Quiz key={JSON.stringify(session.ids) + session.mode} config={session} onExit={() => setSession(null)} />
          : replay && tab === 'learn' ? <Replay key={replay.date} day={replay} onExit={() => go(replayFrom)} onTest={() => dayTest(replay)} />
          : tab === 'home' ? <Home go={go} openSettings={() => setSettingsOpen(true)} startTest={startDailyTest} replayToday={replayToday} showDays={showDays} />
          : tab === 'learn' ? <Learn startTodayTest={startDailyTest} view={learnView} setView={setLearnView} onReplay={d => openReplay(d)} onDayTest={dayTest} />
          : tab === 'review' ? <Review start={start} />
          : tab === 'words' ? <Words start={start} goLearn={() => go('learn')} />
          : <Stats />}
      </main>
      <nav className="tabbar" aria-label="Ana menü">
        {TABS.map(([t, label, icon]) => (
          <button key={t} className={tab === t ? 'on' : ''} aria-current={tab === t ? 'page' : undefined} onClick={() => go(t)}>
            <Icon path={icon} size={24} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
