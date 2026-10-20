import React from 'react';
import { PlayerProfile, Song } from '../types/music';
import { getLevelTitle, Language, ThemeMode } from '../utils/i18n';
import { Award, Play, RotateCcw, TrendingUp } from 'lucide-react';

interface ProgressDashboardViewProps {
  profile: PlayerProfile;
  songs: Song[];
  lang: Language;
  theme: ThemeMode;
  onSelectSong: (song: Song) => void;
  onResetProgress: () => void;
}

export const ProgressDashboardView: React.FC<ProgressDashboardViewProps> = ({
  profile,
  songs,
  lang,
  theme,
  onSelectSong,
  onResetProgress,
}) => {
  const isHu = lang === 'hu';
  const isLight = theme === 'light';
  const xpIntoLevel = profile.xp % 500;
  const xpPercent = Math.min(100, Math.round((xpIntoLevel / 500) * 100));

  const averageAccuracy =
    profile.history.length > 0
      ? Math.round(
          profile.history.reduce((acc, s) => acc + s.accuracyPercent, 0) /
            profile.history.length
        )
      : 0;

  const averageTimingMs =
    profile.history.length > 0
      ? Math.round(
          profile.history.reduce((acc, s) => acc + Math.abs(s.avgTimingOffsetMs), 0) /
            profile.history.length
        )
      : 0;

  const masteredSongsCount = Object.values(profile.bestAccuracyBySong).filter(
    (acc) => acc >= 90
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <div className="space-y-1.5">
          <h1
            className={`text-2xl sm:text-3xl font-bold tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isHu ? 'Haladás' : 'Your progress'}
          </h1>
        </div>

        <button
          onClick={onResetProgress}
          className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
            isLight
              ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isHu ? 'Statisztika alaphelyzetbe' : 'Reset Demo Statistics'}</span>
        </button>
      </div>

      {/* Top 4 KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`border rounded-xl p-5 space-y-2 ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-[#111827] border-slate-800'
          }`}
        >
          <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {isHu ? 'Aktuális Zongorista Szint' : 'Current Pianist Tier'}
          </div>
          <div
            className={`text-xl font-bold ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {getLevelTitle(profile.level, lang)}
          </div>
          <div
            className={`w-full h-2 rounded-full overflow-hidden ${
              isLight ? 'bg-slate-200' : 'bg-slate-800'
            }`}
          >
            <div
              className="h-full bg-sky-500 transition-all duration-300"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <div
            className={`text-xs font-mono tabular-nums flex justify-between ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            <span>{profile.xp} XP</span>
            <span>
              {500 - xpIntoLevel} XP &rarr; {profile.level + 1}. {isHu ? 'Szint' : 'Level'}
            </span>
          </div>
        </div>

        <div
          className={`border rounded-xl p-5 space-y-2 ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-[#111827] border-slate-800'
          }`}
        >
          <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {isHu ? 'Átlagos Leütési Pontosság' : 'Average Note Accuracy'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-500">
            {profile.history.length > 0 ? `${averageAccuracy}%` : '—'}
          </div>
          <div
            className={`text-xs font-mono tabular-nums ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {profile.totalNotesHit.toLocaleString()}{' '}
            {isHu ? 'sikeresen leütött hang' : 'total target notes struck'}
          </div>
        </div>

        <div
          className={`border rounded-xl p-5 space-y-2 ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-[#111827] border-slate-800'
          }`}
        >
          <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {isHu ? 'Átlagos Ritmuseltérés' : 'Mean Timing Jitter'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-sky-500">
            {profile.history.length > 0 ? `±${averageTimingMs}ms` : '—'}
          </div>
          <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {averageTimingMs <= 35
              ? isHu
                ? '● Stúdió pontosságú ritmustartás'
                : '● Studio-grade rhythmic precision'
              : isHu
              ? '▲ Fejlődő ütemszinkron'
              : '▲ Developing steady beat synchronization'}
          </div>
        </div>

        <div
          className={`border rounded-xl p-5 space-y-2 ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-[#111827] border-slate-800'
          }`}
        >
          <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {isHu ? 'Elsajátított Darabok (≥90%)' : 'Repertoire Mastery (≥90%)'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-500">
            {masteredSongsCount} / {songs.length}
          </div>
          <div
            className={`text-xs font-mono tabular-nums ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {profile.sessionsCompleted}{' '}
            {isHu ? 'befejezett gyakorlás' : 'practice sessions completed'}
          </div>
        </div>
      </div>

      {/* 5-Level Curriculum Roadmap & Repertoire Matrix */}
      <div
        className={`border rounded-xl p-6 space-y-6 ${
          isLight
            ? 'bg-white border-slate-200 shadow-sm'
            : 'bg-[#111827] border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              className={`text-base font-bold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              <Award className="w-4 h-4 text-sky-500" />
              <span>
                {isHu
                  ? 'Tananyag Szinttérkép és Eredmények'
                  : 'Curriculum Level Roadmap & Score Mastery'}
              </span>
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {isHu
                ? 'Minden darabnál látható az eddigi legjobb elért pontosságod.'
                : 'Each piece tracks your highest recorded accuracy and unlocks progressive tempo challenges.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((lvl) => {
            const levelSongs = songs.filter((s) => s.level === lvl);
            const isUnlocked = profile.level >= lvl || lvl <= 2;

            return (
              <div
                key={lvl}
                className={`border rounded-lg p-4 flex flex-col justify-between space-y-4 ${
                  isLight
                    ? isUnlocked
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-slate-50/60 border-slate-200/60 opacity-75'
                    : isUnlocked
                    ? 'bg-[#0B0F17] border-slate-800'
                    : 'bg-[#0B0F17] border-slate-800/50 opacity-75'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-xs font-mono font-semibold text-sky-500">
                    {getLevelTitle(lvl, lang)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {levelSongs.length} {isHu ? 'darab' : 'pieces'}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {levelSongs.map((s) => {
                    const best = profile.bestAccuracyBySong[s.id];
                    const title = isHu && s.titleHu ? s.titleHu : s.title;
                    return (
                      <div
                        key={s.id}
                        className={`p-2.5 border rounded flex flex-col gap-1.5 ${
                          isLight
                            ? 'bg-white border-slate-200'
                            : 'bg-[#111827] border-slate-800/90'
                        }`}
                      >
                        <div
                          className={`text-xs font-semibold leading-tight ${
                            isLight ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {title}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                          <span
                            className={
                              best !== undefined && best >= 90
                                ? 'text-emerald-500 font-semibold'
                                : best !== undefined
                                ? 'text-amber-500'
                                : 'text-slate-400'
                            }
                          >
                            {best !== undefined
                              ? isHu
                                ? `Legjobb: ${best}%`
                                : `Best: ${best}%`
                              : isHu
                              ? 'Nincs még'
                              : 'Not played'}
                          </span>
                          <button
                            onClick={() => onSelectSong(s)}
                            className="text-sky-500 hover:text-sky-400 flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{isHu ? 'Gyakorlás' : 'Practice'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Session History Table */}
      <div
        className={`border rounded-xl overflow-hidden ${
          isLight
            ? 'bg-white border-slate-200 shadow-sm'
            : 'bg-[#111827] border-slate-800'
        }`}
      >
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h2
              className={`text-base font-bold ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {isHu ? 'Legutóbbi Gyakorlások Naplója' : 'Recent Practice Session Log'}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {profile.history.length} {isHu ? 'mentett alkalom' : 'Recorded Sessions'}
          </span>
        </div>

        {profile.history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {isHu
              ? 'Még nincs befejezett gyakorlás. Játssz le egy dalt a Gyakorló Stúdióban, vagy kattints a „Befejezés és Értékelés” gombra.'
              : 'No completed sessions yet. Play a song in the Practice Studio or click "Finish & Grade" to see your performance analytics.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b text-[11px] font-semibold ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-500'
                      : 'bg-[#0B0F17] border-slate-800 text-slate-400'
                  }`}
                >
                  <th className="py-3 px-6">{isHu ? 'Darab' : 'Piece'}</th>
                  <th className="py-3 px-4">{isHu ? 'Mód és Kéz' : 'Mode & Hand'}</th>
                  <th className="py-3 px-4">{isHu ? 'Tempó' : 'Tempo'}</th>
                  <th className="py-3 px-4">{isHu ? 'Pontosság' : 'Accuracy'}</th>
                  <th className="py-3 px-4">
                    {isHu ? 'Időzítési eltérés' : 'Timing Offset'}
                  </th>
                  <th className="py-3 px-4">{isHu ? 'Max Sorozat' : 'Max Streak'}</th>
                  <th className="py-3 px-6 text-right">{isHu ? 'Szerzett XP' : 'XP Earned'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-500/20 text-xs font-mono tabular-nums">
                {profile.history.map((session) => (
                  <tr key={session.id} className="hover:bg-sky-500/5">
                    <td className="py-3.5 px-6 font-sans">
                      <div
                        className={`font-semibold ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {session.songTitle}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isHu ? `${session.songLevel}. Szint` : `Level ${session.songLevel}`} ·{' '}
                        {session.timestamp}
                      </div>
                    </td>
                    <td
                      className={`py-3.5 px-4 font-sans ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {session.mode === 'wait-for-note'
                        ? isHu
                          ? 'Várakozó'
                          : 'Wait-for-Note'
                        : isHu
                        ? 'Folyamatos'
                        : 'Continuous'}{' '}
                      ·{' '}
                      {session.handSelection === 'both'
                        ? isHu
                          ? 'Mindkét kéz'
                          : 'Both Hands'
                        : session.handSelection === 'right'
                        ? isHu
                          ? 'Jobb kéz'
                          : 'Right Hand'
                        : isHu
                        ? 'Bal kéz'
                        : 'Left Hand'}
                    </td>
                    <td className={isLight ? 'py-3.5 px-4 text-slate-700' : 'py-3.5 px-4 text-slate-300'}>
                      {Math.round(session.tempoMultiplier * 100)}%
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold ${
                          session.accuracyPercent >= 90
                            ? 'text-emerald-500'
                            : session.accuracyPercent >= 75
                            ? 'text-amber-500'
                            : 'text-red-500'
                        }`}
                      >
                        {session.accuracyPercent}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-sky-500">
                      {session.avgTimingOffsetMs > 0
                        ? `+${session.avgTimingOffsetMs}ms`
                        : `${session.avgTimingOffsetMs}ms`}
                    </td>
                    <td className="py-3.5 px-4 text-amber-500">{session.maxStreak}</td>
                    <td className="py-3.5 px-6 text-right text-emerald-500 font-semibold">
                      +{session.xpEarned} XP
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
