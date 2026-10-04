import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpegPath from 'ffmpeg-static';
import { createLogger } from '@careeros/logger';

const execFileAsync = promisify(execFile);
const logger = createLogger('audio-splitter');

export interface AudioChunk {
  index: number;
  buffer: Buffer;
  filename: string;
  startTime: number;
  duration: number;
}

export interface SplitOptions {
  maxChunkDurationSec?: number; // e.g. 25 seconds
  overlapSec?: number; // e.g. 1 second
}

/**
 * Parses WAV file buffer header to extract duration if valid RIFF/WAVE
 */
export function getWavDuration(buffer: Buffer): number | null {
  if (buffer.length < 44) return null;
  const riff = buffer.toString('ascii', 0, 4);
  const wave = buffer.toString('ascii', 8, 12);
  if (riff !== 'RIFF' || wave !== 'WAVE') return null;

  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    if (chunkId === 'fmt ' && chunkSize >= 16) {
      byteRate = buffer.readUInt32LE(offset + 16);
    } else if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
  }

  if (byteRate > 0 && dataSize > 0) {
    return dataSize / byteRate;
  }
  return null;
}

/**
 * Probes the duration of an audio buffer in seconds using ffmpeg or header analysis
 */
export async function probeAudioDuration(
  audioBuffer: Buffer,
  filename: string = 'audio.webm',
): Promise<number> {
  // Fast path for WAV
  if (filename.endsWith('.wav')) {
    const wavDuration = getWavDuration(audioBuffer);
    if (wavDuration !== null && !isNaN(wavDuration) && wavDuration > 0) {
      return wavDuration;
    }
  }

  const binary: string = (typeof ffmpegPath === 'string' && ffmpegPath) ? ffmpegPath : 'ffmpeg';
  const tempDir = os.tmpdir();
  const tempExt = path.extname(filename) || '.webm';
  const tempFile = path.join(tempDir, `careeros_probe_${crypto.randomUUID()}${tempExt}`);

  try {
    await fs.promises.writeFile(tempFile, audioBuffer);

    // ffmpeg -i outputs file metadata to stderr
    let output = '';
    try {
      const res = await execFileAsync(binary, ['-i', tempFile]);
      output = res.stderr || res.stdout || '';
    } catch (err: any) {
      output = err.stderr || err.stdout || '';
    }

    const match = output.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d+)/);
    if (match) {
      const hours = parseFloat(match[1]);
      const minutes = parseFloat(match[2]);
      const seconds = parseFloat(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }

    // Default estimate if unable to probe
    return 0;
  } catch (err) {
    logger.warn({ err }, 'Could not probe audio duration via ffmpeg');
    return 0;
  } finally {
    try {
      await fs.promises.unlink(tempFile);
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * Splits an audio buffer into chunks of <= maxChunkDurationSec with an optional overlap
 */
export async function splitAudioIntoChunks(
  audioBuffer: Buffer,
  filename: string = 'recording.webm',
  options: SplitOptions = {},
): Promise<AudioChunk[]> {
  const maxDuration = options.maxChunkDurationSec ?? 25; // 25s chunk
  const overlap = options.overlapSec ?? 1; // 1s overlap
  const step = Math.max(1, maxDuration - overlap);

  const totalDuration = await probeAudioDuration(audioBuffer, filename);

  // If audio is shorter than or equal to 30s, return as single chunk without processing
  if (totalDuration <= 30 && totalDuration > 0) {
    return [
      {
        index: 0,
        buffer: audioBuffer,
        filename,
        startTime: 0,
        duration: totalDuration,
      },
    ];
  }

  // If total duration could not be determined or is <= 0, but buffer is small, return as single chunk
  if (totalDuration <= 0) {
    return [
      {
        index: 0,
        buffer: audioBuffer,
        filename,
        startTime: 0,
        duration: 0,
      },
    ];
  }

  const binary: string = (typeof ffmpegPath === 'string' && ffmpegPath) ? ffmpegPath : 'ffmpeg';
  const tempDir = os.tmpdir();
  const ext = path.extname(filename) || '.webm';
  const inputTemp = path.join(tempDir, `careeros_split_in_${crypto.randomUUID()}${ext}`);
  const createdTempFiles: string[] = [inputTemp];

  const chunks: AudioChunk[] = [];

  try {
    await fs.promises.writeFile(inputTemp, audioBuffer);

    let start = 0;
    let chunkIndex = 0;

    while (start < totalDuration) {
      const currentChunkDuration = Math.min(maxDuration, totalDuration - start);
      if (currentChunkDuration <= 0.5 && chunkIndex > 0) {
        // Skip trailing fraction of a second if already covered
        break;
      }

      const chunkFilename = `chunk_${chunkIndex}.wav`;
      const chunkOutput = path.join(tempDir, `careeros_chunk_${crypto.randomUUID()}.wav`);
      createdTempFiles.push(chunkOutput);

      // Decode and slice into clean 16kHz 16-bit mono WAV
      // This is 100% reliable across all browser WebM, MP3, OGG and WAV formats
      await execFileAsync(binary, [
        '-y',
        '-ss',
        start.toFixed(3),
        '-t',
        currentChunkDuration.toFixed(3),
        '-i',
        inputTemp,
        '-vn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-c:a',
        'pcm_s16le',
        chunkOutput,
      ]);

      const chunkBuffer = await fs.promises.readFile(chunkOutput);
      chunks.push({
        index: chunkIndex,
        buffer: chunkBuffer,
        filename: chunkFilename,
        startTime: start,
        duration: currentChunkDuration,
      });

      start += step;
      chunkIndex++;
    }

    return chunks;
  } finally {
    // Clean up all temporary files created during slicing
    for (const f of createdTempFiles) {
      try {
        await fs.promises.unlink(f);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Combines overlapping chunk transcripts cleanly without duplicating boundary words
 */
export function mergeTranscripts(transcripts: string[]): string {
  const filtered = transcripts.map((t) => (t || '').trim()).filter((t) => t.length > 0);
  if (filtered.length === 0) return '';
  if (filtered.length === 1) return filtered[0];

  let result = filtered[0];

  for (let i = 1; i < filtered.length; i++) {
    const current = filtered[i];
    const resultWords = result.split(/\s+/);
    const currentWords = current.split(/\s+/);

    let bestOverlapLen = 0;
    const maxLookback = Math.min(8, resultWords.length, currentWords.length);

    for (let len = maxLookback; len >= 1; len--) {
      const resultSuffix = resultWords.slice(resultWords.length - len).map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const currentPrefix = currentWords.slice(0, len).map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''));

      if (resultSuffix.join(' ') === currentPrefix.join(' ')) {
        bestOverlapLen = len;
        break;
      }
    }

    if (bestOverlapLen > 0) {
      const remainder = currentWords.slice(bestOverlapLen).join(' ');
      if (remainder.length > 0) {
        result = `${result} ${remainder}`;
      }
    } else {
      result = `${result} ${current}`;
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}
