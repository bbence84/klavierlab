import React from 'react';
import { MidiConnectionInfo, MidiPacketLog } from '../types/music';
import { Language, ThemeMode } from '../utils/i18n';
import { BLE_MIDI_CHARACTERISTIC_UUID, BLE_MIDI_SERVICE_UUID } from '../utils/midiService';
import { APP_VERSION, CHANGE_LABELS, RELEASES } from '../data/releases';
import {
  Bluetooth,
  ChevronDown,
  Play,
  Radio,
  Usb,
  Volume2,
} from 'lucide-react';

interface SetupGuideViewProps {
  connectionInfo: MidiConnectionInfo;
  midiLogs: MidiPacketLog[];
  lang: Language;
  theme: ThemeMode;
  onConnectBle: () => void;
  onConnectWebMidi: () => void;
  onDisconnect: () => void;
  onTriggerTestChord: () => void;
  onTestMidiOutput: () => void;
  onClearLogs: () => void;
}

export const SetupGuideView: React.FC<SetupGuideViewProps> = ({
  connectionInfo,
  midiLogs,
  lang,
  theme,
  onConnectBle,
  onConnectWebMidi,
  onDisconnect,
  onTriggerTestChord,
  onTestMidiOutput,
  onClearLogs,
}) => {
  const isHu = lang === 'hu';
  const isLight = theme === 'light';

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Top Section Header */}
      <div
        className={`flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <div className="space-y-1.5">
          <h1
            className={`text-2xl sm:text-3xl font-bold tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isHu ? 'MIDI eszközök' : 'MIDI devices'}
          </h1>
          <p className="text-xs font-mono text-slate-500">KlavierLab v{APP_VERSION}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onConnectBle}
            disabled={connectionInfo.status === 'connecting'}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Bluetooth className="w-4 h-4" />
            <span>
              {isHu
                ? 'Csatlakozás Bluetooth MIDI-n (Közvetlen)'
                : 'Pair via Web Bluetooth (Direct)'}
            </span>
          </button>

          <button
            onClick={onConnectWebMidi}
            disabled={connectionInfo.status === 'connecting'}
            title={isHu ? 'USB vagy az operációs rendszerhez csatlakoztatott Bluetooth MIDI' : 'USB or OS-connected Bluetooth MIDI'}
            className={`px-4 py-2.5 font-medium text-xs rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
            }`}
          >
            <Usb className="w-4 h-4 text-amber-500" />
            <span>
              {isHu ? 'Csatlakozás USB MIDI-n (Web MIDI)' : 'Connect via USB / Web MIDI'}
            </span>
          </button>
        </div>
      </div>

      {/* 3 Simple Steps for Direct Connection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className={`border rounded-xl p-5 space-y-2 ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-[#111827] border-slate-800'
          }`}
        >
          <div className="text-xs font-mono font-semibold text-sky-500">01</div>
          <h3
            className={`text-base font-bold ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isHu
              ? 'Kapcsold be a zongorát'
              : 'Turn On Your Keyboard'}
          </h3>
          <p
            className={`text-xs leading-relaxed ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {isHu
              ? 'Kapcsold be a digitális zongorádat vagy MIDI billentyűzetedet, és győződj meg róla, hogy a Bluetooth funkció aktív rajta (vagy dugd be az USB kábelt).'
              : 'Power on your digital piano or MIDI keyboard and ensure its Bluetooth MIDI mode is active (or plug in a USB cable).'}
          </p>
        </div>

        <div
          className={`border rounded-xl p-5 space-y-2 ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-[#111827] border-slate-800'
          }`}
        >
          <div className="text-xs font-mono font-semibold text-amber-500">02</div>
          <h3
            className={`text-base font-bold ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isHu
              ? 'Bluetooth vagy rendszer MIDI'
              : 'Bluetooth or OS MIDI'}
          </h3>
          <p
            className={`text-xs leading-relaxed ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {isHu
              ? 'Macen a már csatlakoztatott MIDI-billentyűzet az Audio MIDI Setup > MIDI Studio > Bluetooth ablakban kezelhető, majd a USB / Web MIDI gombbal érhető el. Új közvetlen kapcsolathoz használd a Bluetooth gombot.'
              : 'On Mac, an already-connected MIDI keyboard can use Audio MIDI Setup > MIDI Studio > Bluetooth, then USB / Web MIDI here. Use direct Bluetooth for a new BLE connection.'}
          </p>
        </div>

        <div
          className={`border rounded-xl p-5 space-y-2 ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-[#111827] border-slate-800'
          }`}
        >
          <div className="text-xs font-mono font-semibold text-emerald-500">03</div>
          <h3
            className={`text-base font-bold ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isHu
              ? 'Azonnali visszajelzés játék közben'
              : 'Play & Receive Instant Visual Feedback'}
          </h3>
          <p
            className={`text-xs leading-relaxed ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {isHu
              ? 'Amikor leütsz egy billentyűt, azonnal látod a visszajelzést a kottában és a lehulló sávokon. Ha a saját zongorád hangszóróját használod, a felső sávban kikapcsolhatod az alkalmazás saját zongorahangját.'
              : 'Every key you strike is immediately graded on the falling notes and Grand Staff. If your piano has built-in speakers, you can mute the app synth in the Studio toolbar.'}
          </p>
        </div>
      </div>

      {/* Hardware Connection Status & Live MIDI Signal Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 cols: Active Transport & GATT Specification */}
        <div
          className={`lg:col-span-5 border rounded-xl p-6 flex flex-col justify-between space-y-6 ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-[#111827] border-slate-800'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2
                className={`text-base font-bold ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                {isHu ? 'Aktív MIDI Kapcsolat' : 'Active MIDI Transport'}
              </h2>
              <span
                className={`text-xs font-mono font-semibold ${
                  connectionInfo.status === 'connected'
                    ? 'text-emerald-500'
                    : connectionInfo.status === 'connecting'
                    ? 'text-amber-500'
                    : isLight
                    ? 'text-slate-500'
                    : 'text-slate-400'
                }`}
              >
                {connectionInfo.status === 'connected'
                  ? isHu
                    ? '● CSATLAKOZTATVA'
                    : '● CONNECTED'
                  : connectionInfo.status === 'connecting'
                  ? isHu
                    ? '▲ KERESÉS...'
                    : '▲ SCANNING...'
                  : isHu
                  ? '○ KÉSZENLÉT (VIRTUÁLIS ZONGORA)'
                  : '○ STANDBY (VIRTUAL READY)'}
              </span>
            </div>

            <div
              className={`midi-device-info border rounded-lg p-4 space-y-2.5 text-xs ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0B0F17] border-slate-800/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                  {isHu ? 'Csatlakoztatott eszköz:' : 'Connected Device:'}
                </span>
                <span
                  className={`font-mono font-semibold ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {connectionInfo.deviceName ||
                    (isHu ? 'Képernyő / Számítógép billentyűzet' : 'Studio Virtual Keyboard')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                  {isHu ? 'Adatátviteli réteg:' : 'Transport Layer:'}
                </span>
                <span className="font-mono text-sky-500">
                  {connectionInfo.transport === 'web-bluetooth'
                    ? 'Web Bluetooth GATT (BLE MIDI)'
                    : connectionInfo.transport === 'web-midi'
                    ? 'Web MIDI API'
                    : isHu
                    ? 'Billentyűzet / Érintőképernyő'
                    : 'Computer Keys / Touch'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                  {isHu ? 'Zongora MIDI kimenet:' : 'Piano MIDI output:'}
                </span>
                <span className={connectionInfo.outputAvailable ? 'font-mono text-emerald-600' : 'font-mono text-slate-500'}>
                  {connectionInfo.outputAvailable ? connectionInfo.outputName : isHu ? 'Nem érhető el' : 'Not available'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                  BLE Service UUID:
                </span>
                <span
                  className={`font-mono text-[11px] ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {BLE_MIDI_SERVICE_UUID}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                  BLE Characteristic:
                </span>
                <span
                  className={`font-mono text-[11px] ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {BLE_MIDI_CHARACTERISTIC_UUID}
                </span>
              </div>
            </div>

            {connectionInfo.errorMessage && (
              <div className="bg-amber-950/80 border border-amber-500/40 rounded-lg p-3.5 text-xs text-amber-100 leading-relaxed">
                <strong className="font-semibold text-amber-300">
                  {isHu ? 'Megjegyzés: ' : 'Connection Notice: '}
                </strong>
                {connectionInfo.errorMessage}
              </div>
            )}
            {connectionInfo.outputErrorMessage && (
              <div role="alert" className="border border-red-500/40 rounded-lg p-3.5 text-xs text-red-500 leading-relaxed">
                {connectionInfo.outputErrorMessage}
              </div>
            )}
          </div>

          <div
            className={`pt-2 border-t flex items-center justify-between gap-3 flex-wrap ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <button
              onClick={onTestMidiOutput}
              disabled={connectionInfo.status !== 'connected' || !connectionInfo.outputAvailable}
              title={isHu ? 'C4 hang csak a MIDI zongorára' : 'Send C4 only to the MIDI piano'}
              className="px-3 py-2 text-xs text-sky-600 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Volume2 className="w-4 h-4" />
              <span>{isHu ? 'Zongora kimenet teszt' : 'Test piano output'}</span>
            </button>
            <button
              onClick={onTriggerTestChord}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-sky-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-slate-700'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                {isHu
                  ? 'Teszt BLE MIDI Akkord Küldése'
                  : 'Simulate BLE MIDI Chord Packet'}
              </span>
            </button>

            {connectionInfo.status === 'connected' && (
              <button
                onClick={onDisconnect}
                className="px-3.5 py-2 text-xs font-medium text-red-500 hover:text-red-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isHu ? 'Leválasztás' : 'Disconnect Hardware'}
              </button>
            )}
          </div>
        </div>

        {/* Right 7 cols: Real-Time MIDI Packet Stream */}
        <div
          className={`lg:col-span-7 border rounded-xl p-6 flex flex-col justify-between ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-[#111827] border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-sky-500" />
                <h2
                  className={`text-base font-bold ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {isHu
                    ? 'Valós Idejű MIDI Csomagfigyelő (Diagnosztika)'
                    : 'Real-Time Incoming MIDI Packet Inspector'}
                </h2>
              </div>
              <button
                onClick={onClearLogs}
                className={`text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isLight
                    ? 'text-slate-500 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isHu ? 'Napló törlése' : 'Clear Log'}
              </button>
            </div>

            <div
              className={`border rounded-lg overflow-hidden ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0B0F17] border-slate-800/90'
              }`}
            >
              <div
                className={`grid grid-cols-12 px-4 py-2 border-b text-[11px] font-semibold ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400'
                }`}
              >
                <div className="col-span-3">{isHu ? 'Idő' : 'Time'}</div>
                <div className="col-span-2">{isHu ? 'Forrás' : 'Source'}</div>
                <div className="col-span-3">{isHu ? 'Nyers Hex' : 'Raw Hex'}</div>
                <div className="col-span-2">{isHu ? 'Hang' : 'Note'}</div>
                <div className="col-span-2 text-right">
                  {isHu ? 'Erősség' : 'Velocity'}
                </div>
              </div>

              <div className="h-[195px] overflow-y-auto divide-y divide-slate-500/20 font-mono text-xs tabular-nums">
                {midiLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center font-sans">
                    <p className="text-xs">
                      {isHu
                        ? 'Még nem érkezett MIDI jel. Üss le egy billentyűt a csatlakoztatott zongorán, vagy kattints a „Teszt BLE MIDI Akkord Küldése” gombra.'
                        : 'No MIDI packets captured yet. Press any key on your connected MIDI keyboard or click "Simulate BLE MIDI Chord Packet" to verify signal parsing.'}
                    </p>
                  </div>
                ) : (
                  midiLogs.map((log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-12 px-4 py-2 items-center hover:bg-sky-500/5"
                    >
                      <div className="col-span-3 text-slate-400 text-[11px]">
                        {log.timestamp}
                      </div>
                      <div className="col-span-2">
                        <span
                          className={
                            log.source === 'BLE-MIDI'
                              ? 'text-sky-500'
                              : log.source === 'WebMIDI'
                              ? 'text-amber-500'
                              : 'text-slate-400'
                          }
                        >
                          {log.source}
                        </span>
                      </div>
                      <div
                        className={`col-span-3 text-[11px] ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}
                      >
                        {log.rawHex}
                      </div>
                      <div
                        className={`col-span-2 font-bold ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {log.noteName}{' '}
                        <span className="text-slate-400 font-normal">({log.midi})</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span
                          className={
                            log.type === 'Note On' ? 'text-emerald-500' : 'text-slate-400'
                          }
                        >
                          {log.type === 'Note On' ? `vel ${log.velocity}` : 'release'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>MMA BLE-MIDI 1.0 &amp; Web MIDI 1.0</span>
            <span className="font-mono tabular-nums">
              {midiLogs.length} {isHu ? 'esemény' : 'events'}
            </span>
          </div>
        </div>
      </div>
      <section className="release-history" aria-labelledby="release-history-heading">
        <div className="release-heading">
          <h2 id="release-history-heading" className="font-display font-semibold">{isHu ? 'Verzió és változásnapló' : 'Version & changelog'}</h2>
          <span className="font-mono text-xs">KlavierLab v{APP_VERSION}</span>
        </div>
        <p className="release-provenance">
          {isHu
            ? 'A 0.5.0 az első tudatosan követett verzió. A korábbi verziószámok az ellenőrzött fejlesztési munka alapján utólag hozzárendelt mérföldkövek, nem eredeti kiadási címkék. A dátumok a helyi munka napját jelölik.'
            : '0.5.0 is the first explicitly tracked version. Earlier version numbers are retrospective milestones reconstructed from verified development work, not original release tags. Dates refer to the day of that local work.'}
        </p>
        <ol className="release-list">
          {RELEASES.map((release, index) => (
            <li key={release.version}>
              <details open={index === 0}>
                <summary>
                  <span className="release-version font-mono">v{release.version}</span>
                  <span className="release-title">{release.title[lang]}</span>
                  <span className="release-meta">
                    <time dateTime={release.date}>{release.date}</time>
                    <span>{release.version === APP_VERSION ? isHu ? 'Aktuális' : 'Current' : release.reconstructed ? isHu ? 'Utólag összeállítva' : 'Reconstructed' : isHu ? 'Kiadás' : 'Release'}</span>
                  </span>
                  <ChevronDown aria-hidden="true" className="release-chevron" />
                </summary>
                <ul className="release-changes">
                  {release.changes.map((change, changeIndex) => (
                    <li key={changeIndex}>
                      <span className="release-kind">{CHANGE_LABELS[change.kind][lang]}</span>
                      <span>{change.text[lang]}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};
