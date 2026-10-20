import { Song } from '../types/music';
import { parseMidiFileBuffer } from './midiFileParser';

export const SCORE_FILE_ACCEPT = '.mid,.midi,.musicxml,.xml,.mxl,audio/midi,audio/x-midi,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml';

export async function parseScoreFile(file: File): Promise<Song> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Score files must be smaller than 10 MB.');
  const buffer = await file.arrayBuffer();
  if (/\.(mid|midi)$/i.test(file.name)) return parseMidiFileBuffer(buffer, file.name);
  if (/\.(musicxml|xml|mxl)$/i.test(file.name)) {
    const { parseMusicXmlFileBuffer } = await import('./musicXmlParser');
    return parseMusicXmlFileBuffer(buffer, file.name);
  }
  throw new Error('Choose a MIDI (.mid, .midi) or MusicXML (.musicxml, .xml, .mxl) file.');
}