import { mdiHomeOutline, mdiBookOpenPageVariantOutline, mdiRepeat, mdiFormatListBulleted, mdiChartBar } from '@mdi/js';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from './components/ui';
import { dayKey } from './lib/date';
import { buildTestPlan, DAILY_TEST_SIZE, ensurePlan, GENERAL_SIZE, generalPool, getState, isLoaded, learnedDays, useApp, type LearnedDay } from './lib/store';
import Home from './screens/Home';
import Learn, { type LearnView } from './screens/Learn';
import Replay from './screens/Replay';
import Quiz, { type SessionConfig } from './screens/Quiz';
import Review from './screens/Review';
import Settings from './screens/Settings';
import Stats from './screens/Stats';
import Words from './screens/Words';
import { t } from './lib/i18n';

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

  /** Günün testi: yalnızca bugün öğrenilen kelimelerden 20 soru (kelime azsa farklı test türleriyle tekrar sorulur). */
  const startDailyTest = useCallback(() => {
    const st = getState(); const today = dayKey();
    const todays = Object.keys(st.progress).filter(id => st.progress[id].firstSeen === today);
    const plan = buildTestPlan(todays, DAILY_TEST_SIZE);
    if (plan.length) start({ ids: plan.map(x => x.id), plan, mode: 'mixed', title: t('Günün testi'), daily: true });
  }, [start]);
  /** Genel test: şimdiye kadar öğrenilen kelimelerden (haftada bir zorunlu, istenince her zaman). */
  const startGeneralTest = useCallback(() => {
    const st = getState();
    const plan = buildTestPlan(generalPool(st), GENERAL_SIZE);
    if (plan.length) start({ ids: plan.map(x => x.id), plan, mode: 'mixed', title: t('Genel test'), general: true });
  }, [start]);

  const openReplay = useCallback((d: LearnedDay, from: Tab = 'learn') => { setSession(null); setReplay(d); setReplayFrom(from); if (location.hash !== '#learn') location.hash = 'learn'; setTab('learn'); window.scrollTo(0, 0); }, []);
  const replayToday = useCallback(() => { const d = learnedDays(getState()).find(x => x.date === dayKey()); if (d) openReplay(d, 'home'); }, [openReplay]);
  const dayTest = useCallback((d: LearnedDay) => { const plan = buildTestPlan(d.ids, DAILY_TEST_SIZE); start({ ids: plan.map(x => x.id), plan, mode: 'mixed', title: t('{n}. Gün testi', { n: d.n }) }); }, [start]);
  const showDays = useCallback(() => { setLearnView('days'); go('learn'); }, [go]);

  return (
    <div className="app">
      <main>
        {session && tab === 'review'
          ? <Quiz key={session.title + JSON.stringify(session.ids) + session.mode} config={session} onExit={() => setSession(null)} />
          : replay && tab === 'learn' ? <Replay key={replay.date} day={replay} onExit={() => go(replayFrom)} onTest={() => dayTest(replay)} />
          : tab === 'home' ? <Home go={go} openSettings={() => setSettingsOpen(true)} startTest={startDailyTest} startGeneral={startGeneralTest} replayToday={replayToday} showDays={showDays} />
          : tab === 'learn' ? <Learn startTodayTest={startDailyTest} startGeneral={startGeneralTest} view={learnView} setView={setLearnView} onReplay={d => openReplay(d)} onDayTest={dayTest} />
          : tab === 'review' ? <Review start={start} startGeneral={startGeneralTest} />
          : tab === 'words' ? <Words start={start} goLearn={() => go('learn')} />
          : <Stats />}
      </main>
      <nav className="tabbar" aria-label={t('Ana menü')}>
        {TABS.map(([tb, label, icon]) => (
          <button key={tb} className={tab === tb ? 'on' : ''} aria-current={tab === tb ? 'page' : undefined} onClick={() => go(tb)}>
            <Icon path={icon} size={24} /><span>{t(label)}</span>
          </button>
        ))}
      </nav>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
