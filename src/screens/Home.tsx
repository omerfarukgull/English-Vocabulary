import { mdiCogOutline, mdiFire, mdiCheckCircle, mdiBookOpenVariant, mdiRepeat, mdiClipboardCheckOutline, mdiTrophyOutline, mdiBellRingOutline, mdiPlayCircleOutline, mdiCalendarMonthOutline } from '@mdi/js';
import { FocusPicker, Icon, ProgressBar } from '../components/ui';
import { dayKey } from '../lib/date';
import { reminderDue } from '../lib/reminder';
import { dueIds, setFocusCat, streak, todayNewCount, useApp } from '../lib/store';
import { catName } from '../lib/data';
import { locale, t } from '../lib/i18n';
import type { Tab } from '../App';

export default function Home({ go, openSettings, startTest, replayToday, showDays }: { go: (t: Tab) => void; openSettings: () => void; startTest: () => void; replayToday: () => void; showDays: () => void }) {
  const s = useApp();
  const goal = s.settings.dailyGoal;
  const learnedToday = todayNewCount(s);
  const today = s.days[dayKey()];
  const reviewsToday = today?.reviews ?? 0;
  const due = dueIds(s).length;
  const total = Object.values(s.progress).filter(p => p.status === 'learned').length;
  const seen = Object.keys(s.progress).length;
  const st = streak(s);
  const pct = Math.min(100, Math.round((learnedToday / goal) * 100));
  const goalDone = learnedToday >= goal;
  const testDone = !!today?.testDone;
  const allDone = goalDone && due === 0 && (testDone || learnedToday === 0);
  const dateStr = new Date().toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="screen">
      <header className="top">
        <div><div className="muted small">{dateStr}</div><h1>{t('Kelime Defterim')}</h1></div>
        <button className="icon-btn" onClick={openSettings} aria-label={t('Ayarlar')}><Icon path={mdiCogOutline} /></button>
      </header>

      {reminderDue() && <div className="notice warn" role="status"><Icon path={mdiBellRingOutline} size={20} /><div><b>{t('Hatırlatma saatin geçti.')}</b><span className="small">{t('Bugünkü hedefe {n} kelime kaldı.', { n: goal - learnedToday })}</span></div></div>}
      <section className="card hero">
        <div className="muted">{t('Bugünkü Hedefin')}</div>
        <div className="hero-num"><b>{Math.min(learnedToday, 999)}</b> / {t('{n} kelime', { n: goal })}</div>
        <ProgressBar value={learnedToday / goal} label={t('Günlük ilerleme')} />
        <div className="row between small"><span>{t('Günlük ilerleme: %{n}', { n: pct })}</span>{learnedToday > goal && <span>{t('+{n} ekstra', { n: learnedToday - goal })}</span>}</div>
        {goalDone
          ? <div className="success-msg"><Icon path={mdiTrophyOutline} size={20} /> {t('Tebrikler! Bugünkü {n} kelime hedefini tamamladın.', { n: goal })}</div>
          : <button className="btn primary block" onClick={() => go('learn')}><Icon path={mdiBookOpenVariant} size={20} /> {learnedToday === 0 ? t('Yeni kelime öğren') : t('Öğrenmeye devam et')}</button>}
      </section>

      <section className="card replay-card">
        <h2>{t('Öğrendiklerini tekrar et')}</h2>
        <p className="muted small">{learnedToday > 0 ? t('Bugün öğrendiğin {n} kelimeyi, öğrenirken olduğu gibi kart kart yeniden gözden geçir.', { n: learnedToday }) : t('Bugün henüz kelime öğrenmedin. Önceki günlerin kelimelerine "Günlerim" bölümünden ulaşabilirsin.')}</p>
        <div className="replay-btns">
          {learnedToday > 0 && <button className="btn primary block" onClick={replayToday}><Icon path={mdiPlayCircleOutline} size={20} /> {t('Bugünü tekrar et ({n})', { n: learnedToday })}</button>}
          <button className="btn block" onClick={showDays} disabled={seen === 0}><Icon path={mdiCalendarMonthOutline} size={20} /> {t('Tüm günlerim')}</button>
        </div>
      </section>

      <section className="card">
        <FocusPicker value={s.settings.focusCat} onChange={setFocusCat} />
        <p className="muted small" style={{ margin: '8px 0 0' }}>{s.settings.focusCat
          ? t('Yeni kelimeler yalnızca "{c}" kategorisinden gelir. Tekrar ekranında da kategori seçebilirsin.', { c: catName(s.settings.focusCat) })
          : t('Yeni kelimeler tüm kategorilerden karışık gelir. Belirli bir konuya odaklanmak için kategori seç.')}</p>
      </section>

      <section className="stat-row">
        <div className="mini"><b>{reviewsToday}</b><span>{t('Bugünkü tekrar')}</span></div>
        <div className="mini"><b>{total}</b><span>{t('Öğrenilen toplam')}</span></div>
        <div className="mini"><b className="row center"><Icon path={mdiFire} size={18} className="fire" />{st.current}</b><span>{t('Gün serisi')}</span></div>
      </section>

      <section className="card">
        <h2>{t('Bugün yapılacaklar')}</h2>
        <ol className="todo">
          <li className={goalDone ? 'done' : ''}>
            <Icon path={goalDone ? mdiCheckCircle : mdiBookOpenVariant} size={22} />
            <div><b>{t('{n} yeni kelime öğren', { n: goal })}</b><span className="muted small">{goalDone ? t('Tamamlandı') : t('{n} kelime kaldı', { n: goal - learnedToday })}</span></div>
            {!goalDone && <button className="btn small" onClick={() => go('learn')}>{t('Başla')}</button>}
          </li>
          <li className={due === 0 ? 'done' : ''}>
            <Icon path={due === 0 ? mdiCheckCircle : mdiRepeat} size={22} />
            <div><b>{t('Tekrarları tamamla')}</b><span className="muted small">{due === 0 ? (seen ? t('Şu an bekleyen tekrar yok') : t('Önce birkaç kelime öğren')) : t('{n} kelime tekrar bekliyor', { n: due })}</span></div>
            {due > 0 && <button className="btn small" onClick={() => go('review')}>{t('Tekrar yap')}</button>}
          </li>
          <li className={testDone ? 'done' : ''}>
            <Icon path={testDone ? mdiCheckCircle : mdiClipboardCheckOutline} size={22} />
            <div><b>{t('Günün testini çöz')}</b><span className="muted small">{testDone ? t('Tamamlandı') : seen ? t('Karışık, kısa bir test') : t('Kelime öğrendikten sonra açılır')}</span></div>
            {!testDone && seen > 0 && <button className="btn small" onClick={startTest}>{t('Teste başla')}</button>}
          </li>
        </ol>
        {allDone && seen > 0 && <p className="success-msg">{t('Bugünlük her şey tamam. Yarın görüşmek üzere!')}</p>}
      </section>

      <section className="quick">
        <button className="btn primary" onClick={() => go('learn')}>{t('Yeni kelime öğren')}</button>
        <button className="btn" onClick={() => go('review')} disabled={seen === 0}>{t('Tekrar yap')}</button>
        <button className="btn" onClick={startTest} disabled={seen === 0}>{t('Teste başla')}</button>
      </section>
    </div>
  );
}
