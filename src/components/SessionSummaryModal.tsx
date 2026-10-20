import React from 'react';
import {
  AdaptiveRecommendation,
  HandSelection,
  PlayerProfile,
  SessionStats,
  Song,
} from '../types/music';
import { getLevelTitle, Language, ThemeMode } from '../utils/i18n';
import { Award, CheckCircle2, RotateCcw, Sliders, TrendingUp, X } from 'lucide-react';

interface SessionSummaryModalProps {
  stats: SessionStats;
  song: Song;
  allSongs: Song[];
  profile: PlayerProfile;
  lang: Language;
  theme: ThemeMode;
  onClose: () => void;
  onReplayCurrent: () => void;
  onApplyRecommendation: (rec: AdaptiveRecommendation) => void;
}

export function computeAdaptiveRecommendation(
  stats: SessionStats,
  song: Song,
  allSongs: Song[],
  lang: Language = 'hu'
): AdaptiveRecommendation {
  const { accuracyPercent, tempoMultiplier, mode, handSelection } = stats;
  const isHu = lang === 'hu';
  const isSingleHandSong =
    song.handArrangement === 'right-only' || song.handArrangement === 'left-only';

  // High mastery (>= 92% accuracy)
  if (accuracyPercent >= 92) {
    if (mode === 'wait-for-note') {
      return {
        headline: isHu
          ? 'Kiváló hangpontosság — Ideje kipróbálni a Folyamatos tempó módot'
          : 'Mastered Note Accuracy — Ready for Real-Time Rhythm',
        rationale: isHu
          ? `Elértél ${accuracyPercent}%-os pontosságot Várakozó módban. Válts Folyamatos tempóra ${Math.round(
              Math.min(1.0, tempoMultiplier) * 100
            )}%-os sebességen a ritmustartás gyakorlásához.`
          : `You achieved ${accuracyPercent}% accuracy in Wait-for-Note mode. Transitioning to Continuous Tempo at ${Math.round(
              Math.min(1.0, tempoMultiplier) * 100
            )}% speed will train your rhythmic steadiness.`,
        actionLabel: isHu
          ? 'Váltás Folyamatos tempó módra'
          : 'Switch to Continuous Tempo Mode',
        recommendedTempo: Math.min(1.0, tempoMultiplier),
        recommendedMode: 'continuous',
        recommendedHand: handSelection,
        adjustmentType: 'increase-challenge',
      };
    }

    if (!isSingleHandSong && handSelection !== 'both') {
      return {
        headline: isHu
          ? 'Egykezes szólam elsajátítva — Kapcsold össze a két kezet!'
          : 'Single-Hand Part Mastered — Combine Both Hands',
        rationale: isHu
          ? `A kiválasztott kéz pontossága elérte a ${accuracyPercent}%-ot. Próbáld meg mindkét kézzel 85%-os tempón.`
          : `Your single-hand accuracy reached ${accuracyPercent}%. Combine Both Hands at 85% tempo to build two-hand coordination.`,
        actionLabel: isHu
          ? 'Gyakorlás mindkét kézzel (85% tempó)'
          : 'Practice Both Hands at 85% Tempo',
        recommendedTempo: 0.85,
        recommendedMode: mode,
        recommendedHand: 'both',
        adjustmentType: 'increase-challenge',
      };
    }

    if (tempoMultiplier < 1.15) {
      const nextTempo = Number(Math.min(1.25, tempoMultiplier + 0.1).toFixed(2));
      return {
        headline: isHu
          ? `Kiváló precizitás — Növeld a tempót ${Math.round(nextTempo * 100)}%-ra`
          : `Excellent Precision — Increase Tempo to ${Math.round(nextTempo * 100)}%`,
        rationale: isHu
          ? `${accuracyPercent}%-os pontossággal és ${stats.maxStreak} hangos sorozattal készen állsz a +10%-os tempóemelésre (${Math.round(
              song.bpm * nextTempo
            )} BPM).`
          : `With ${accuracyPercent}% accuracy and ${stats.maxStreak}-note streak, your muscle memory is ready for a +10% tempo boost (${Math.round(
              song.bpm * nextTempo
            )} BPM).`,
        actionLabel: isHu
          ? `Tempó növelése ${Math.round(nextTempo * 100)}%-ra és újrajátszás`
          : `Boost Tempo to ${Math.round(nextTempo * 100)}% & Replay`,
        recommendedTempo: nextTempo,
        recommendedMode: 'continuous',
        recommendedHand: isSingleHandSong ? handSelection : 'both',
        adjustmentType: 'increase-challenge',
      };
    }

    const currentIndex = allSongs.findIndex((s) => s.id === song.id);
    const nextSong =
      allSongs[currentIndex + 1] ||
      allSongs.find((s) => s.level === song.level + 1) ||
      allSongs.find((s) => s.id !== song.id && s.level >= song.level);
    if (nextSong) {
      const nextHand: HandSelection =
        nextSong.handArrangement === 'right-only'
          ? 'right'
          : nextSong.handArrangement === 'left-only'
          ? 'left'
          : 'both';
      const nextTitle = isHu && nextSong.titleHu ? nextSong.titleHu : nextSong.title;
      return {
        headline: isHu
          ? `Darab elsajátítva — Tovább a következőre: "${nextTitle}"`
          : `Lesson Mastered — Advance to "${nextTitle}"`,
        rationale: isHu
          ? `Magabiztosan, ${accuracyPercent}%-os pontossággal játszottad le a darabot. Készen állsz a tananyag következő lépcsőjére.`
          : `You performed "${song.title}" with ${accuracyPercent}% accuracy. You are ready for the next piece in the curriculum.`,
        actionLabel: isHu
          ? `Következő indítása: ${nextTitle}`
          : `Start Next: ${nextTitle}`,
        recommendedTempo: 0.9,
        recommendedMode: 'wait-for-note',
        recommendedHand: nextHand,
        nextSongId: nextSong.id,
        adjustmentType: 'increase-challenge',
      };
    }
  }

  // Moderate performance (75% - 91% accuracy)
  if (accuracyPercent >= 75) {
    return {
      headline: isHu
        ? 'Biztos alapok — Rögzítsd az egyenletes tempót'
        : 'Solid Foundation — Lock In Timing Consistency',
      rationale: isHu
        ? `A hangok ${accuracyPercent}%-át eltaláltad. Még egy gyakorlás ${Math.round(
            tempoMultiplier * 100
          )}%-os tempón segít elérni a 92% feletti mesterszintet.`
        : `You hit ${accuracyPercent}% of target notes. One more pass at ${Math.round(
            tempoMultiplier * 100
          )}% tempo will push you above 92% mastery.`,
      actionLabel: isHu
        ? `Újrajátszás ${Math.round(tempoMultiplier * 100)}%-os tempón`
        : `Solidify at ${Math.round(tempoMultiplier * 100)}% Tempo`,
      recommendedTempo: tempoMultiplier,
      recommendedMode: mode,
      recommendedHand: handSelection,
      adjustmentType: 'maintain-solidify',
    };
  }

  // Needs support (< 75% accuracy)
  if (mode === 'continuous') {
    const slowerTempo = Number(Math.max(0.6, tempoMultiplier - 0.15).toFixed(2));
    return {
      headline: isHu
        ? 'Adaptív segítség — Váltás Várakozó módra és lassabb tempóra'
        : 'Adaptive Support — Switch to Wait-for-Note & Slow Tempo',
      rationale: isHu
        ? `A pontosság ${accuracyPercent}% volt. A Várakozó mód ${Math.round(
            slowerTempo * 100
          )}%-os sebességgel leveszi a tempókényszert, amíg begyakorlod az ujjrendet.`
        : `Accuracy was ${accuracyPercent}%. Switching to Wait-for-Note mode at ${Math.round(
            slowerTempo * 100
          )}% speed removes tempo pressure while you learn the fingerings.`,
      actionLabel: isHu
        ? `Várakozó mód bekapcsolása (${Math.round(slowerTempo * 100)}%)`
        : `Enable Wait-for-Note (${Math.round(slowerTempo * 100)}% Speed)`,
      recommendedTempo: slowerTempo,
      recommendedMode: 'wait-for-note',
      recommendedHand: handSelection,
      adjustmentType: 'ease-difficulty',
    };
  }

  if (isSingleHandSong) {
    return {
      headline: isHu
        ? 'Lassíts 70%-os tempóra Várakozó módban'
        : 'Slow Down to 70% Tempo in Wait-for-Note Mode',
      rationale: isHu
        ? 'Kényelmesen keresd meg a billentyűket a javasolt 1–5 ujjrend alapján.'
        : 'Take your time finding each key with the suggested finger numbers (1–5) shown on the falling blocks and piano keys.',
      actionLabel: isHu
        ? 'Újrajátszás 70%-os tempón (Várakozó mód)'
        : 'Replay at 70% Speed (Wait-for-Note)',
      recommendedTempo: 0.7,
      recommendedMode: 'wait-for-note',
      recommendedHand: handSelection,
      adjustmentType: 'ease-difficulty',
    };
  }

  return {
    headline: isHu
      ? 'Gyakorold először külön a jobb kezes dallamot'
      : 'Isolate Right Hand Melody First (One Hand Only)',
    rationale: isHu
      ? 'Koncentrálj csak a jobb kézre 75%-os tempón, miközben a program automatikusan lejátssza a bal kezes kíséretet.'
      : 'Focusing on the Right Hand melody alone at 75% tempo while KlavierLab auto-plays the Left Hand bass will let you master one hand at a time.',
    actionLabel: isHu
      ? 'Csak jobb kéz gyakorlása (75% tempó)'
      : 'Practice Right Hand Only at 75% Speed',
    recommendedTempo: 0.75,
    recommendedMode: 'wait-for-note',
    recommendedHand: 'right',
    adjustmentType: 'ease-difficulty',
  };
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  stats,
  song,
  allSongs,
  profile,
  lang,
  theme,
  onClose,
  onReplayCurrent,
  onApplyRecommendation,
}) => {
  const isHu = lang === 'hu';
  const isLight = theme === 'light';
  const rec = computeAdaptiveRecommendation(stats, song, allSongs, lang);

  const gradeLetter =
    stats.accuracyPercent >= 95
      ? 'S'
      : stats.accuracyPercent >= 88
      ? 'A'
      : stats.accuracyPercent >= 75
      ? 'B'
      : 'C';

  const xpIntoCurrentLevel = profile.xp % 500;
  const xpProgressPercent = Math.min(100, Math.round((xpIntoCurrentLevel / 500) * 100));
  const displayTitle = isHu && song.titleHu ? song.titleHu : song.title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div
        className={`w-full max-w-3xl border rounded-xl shadow-2xl overflow-hidden my-6 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#111827] border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-5 border-b ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}
        >
          <div>
            <div className="text-xs text-slate-400">
              {isHu
                ? `Gyakorlás Összegzése · ${song.level}. Szint`
                : `Practice Session Complete · Level ${song.level} Repertoire`}
            </div>
            <h2 className="text-xl font-bold mt-0.5">{displayTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-sky-500 rounded-lg transition-colors cursor-pointer"
            aria-label="Close session report"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Top Primary Performance Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div
              className={`border rounded-lg p-4 ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0B0F17] border-slate-800/90'
              }`}
            >
              <div className="text-xs text-slate-400">
                {isHu ? 'Pontosság' : 'Overall Accuracy'}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums">
                  {stats.accuracyPercent}%
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-500">
                  {isHu ? 'Minősítés:' : 'Grade'} {gradeLetter}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                {stats.perfectHits + stats.goodHits}/{stats.totalTargetNotes}{' '}
                {isHu ? 'hang' : 'notes'}
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0B0F17] border-slate-800/90'
              }`}
            >
              <div className="text-xs text-slate-400">
                {isHu ? 'Időzítési pontosság' : 'Timing Precision'}
              </div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-sky-500">
                {stats.avgTimingOffsetMs > 0
                  ? `+${stats.avgTimingOffsetMs}ms`
                  : `${stats.avgTimingOffsetMs}ms`}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {Math.abs(stats.avgTimingOffsetMs) <= 35
                  ? isHu
                    ? '● Pontos ütem'
                    : '● Locked on beat'
                  : stats.avgTimingOffsetMs < 0
                  ? isHu
                    ? '▲ Kissé siető'
                    : '▲ Slightly ahead'
                  : isHu
                  ? '▼ Kissé késő'
                  : '▼ Slightly behind'}
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0B0F17] border-slate-800/90'
              }`}
            >
              <div className="text-xs text-slate-400">
                {isHu ? 'Max sorozat' : 'Max Note Streak'}
              </div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-500">
                {stats.maxStreak}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                {stats.wrongKeyPresses}{' '}
                {isHu ? 'melléütés' : `wrong key${stats.wrongKeyPresses === 1 ? '' : 's'}`}
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0B0F17] border-slate-800/90'
              }`}
            >
              <div className="text-xs text-slate-400">
                {isHu ? 'Szerzett XP' : 'XP Earned'}
              </div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-500">
                +{stats.xpEarned} XP
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                {isHu ? 'Pontszám:' : 'Score:'} {stats.score.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Detailed Hit Breakdown & Level Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`border rounded-lg p-4 space-y-3 ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0B0F17] border-slate-800/90'
              }`}
            >
              <div className="text-xs font-semibold opacity-80">
                {isHu ? 'Leütések részletezése' : 'Note Judgment Breakdown'}
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-500">
                    ● {isHu ? 'Tökéletes:' : 'Perfect Hits:'}
                  </span>
                  <span className="font-semibold">{stats.perfectHits}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sky-500">
                    ◆ {isHu ? 'Jó leütés:' : 'Good Hits:'}
                  </span>
                  <span className="font-semibold">{stats.goodHits}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-500">
                    ▲ {isHu ? 'Korai / Késői:' : 'Early / Late:'}
                  </span>
                  <span className="font-semibold">{stats.earlyLateHits}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-500">
                    ○ {isHu ? 'Kimaradt:' : 'Missed Notes:'}
                  </span>
                  <span className="font-semibold">{stats.missedNotes}</span>
                </div>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 flex flex-col justify-between ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0B0F17] border-slate-800/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold">
                    {getLevelTitle(profile.level, lang)}
                  </span>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {profile.xp} XP
                </span>
              </div>
              <div className="my-2">
                <div
                  className={`w-full h-2 rounded-full overflow-hidden ${
                    isLight ? 'bg-slate-200' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className="h-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${xpProgressPercent}%` }}
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono tabular-nums">
                <span>
                  {isHu ? `${profile.level}. Szint` : `Level ${profile.level}`}
                </span>
                <span>
                  {500 - xpIntoCurrentLevel} XP &rarr; {profile.level + 1}.{' '}
                  {isHu ? 'Szint' : 'Level'}
                </span>
              </div>
            </div>
          </div>

          {/* Measure-by-Measure Accuracy Bar Chart */}
          {stats.measureAccuracies.length > 0 && (
            <div
              className={`border rounded-lg p-4 ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0B0F17] border-slate-800/90'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold opacity-85">
                  {isHu ? 'Ütemenkénti pontosság' : 'Measure-by-Measure Accuracy Analysis'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isHu
                    ? 'Megmutatja, melyik ütemet érdemes külön gyakorolni'
                    : 'Identifies specific bars requiring slow-tempo focus'}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {stats.measureAccuracies.slice(0, 8).map((m) => (
                  <div
                    key={m.measure}
                    className={`flex flex-col items-center border rounded p-2 ${
                      isLight
                        ? 'bg-white border-slate-200'
                        : 'bg-[#111827] border-slate-800/80'
                    }`}
                  >
                    <span className="text-[10px] font-mono text-slate-400">
                      {isHu ? `${m.measure}. ütem` : `Bar ${m.measure}`}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold mt-1 tabular-nums ${
                        m.accuracy >= 90
                          ? 'text-emerald-500'
                          : m.accuracy >= 70
                          ? 'text-amber-500'
                          : 'text-red-500'
                      }`}
                    >
                      {m.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adaptive Difficulty Adjustment Engine Card */}
          <div
            className={`border rounded-lg p-5 ${
              isLight
                ? 'bg-sky-50 border-sky-200'
                : 'bg-[#0E172A] border-sky-500/40'
            }`}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-500">
                  <Sliders className="w-4 h-4" />
                  <span>
                    {isHu
                      ? 'Adaptív Nehézségi Javaslat'
                      : 'Adaptive Difficulty Engine Recommendation'}
                  </span>
                </div>
                <h3 className="text-base font-bold">{rec.headline}</h3>
                <p className="text-xs opacity-80 leading-relaxed">{rec.rationale}</p>
              </div>

              <button
                onClick={() => onApplyRecommendation(rec)}
                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" />
                <span>{rec.actionLabel}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-[#0B0F17] border-slate-800'
          }`}
        >
          <button
            onClick={onReplayCurrent}
            className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>
              {isHu
                ? 'Újrajátszás a jelenlegi beállításokkal'
                : 'Replay With Current Settings'}
            </span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isHu ? 'Kész' : 'Done'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
