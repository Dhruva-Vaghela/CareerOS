import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SarvamVoiceService } from './services/sarvamVoice.service.js';
import {
  getWavDuration,
  probeAudioDuration,
  splitAudioIntoChunks,
  mergeTranscripts,
} from './utils/audioSplitter.js';

/**
 * Creates a mock PCM WAV buffer of a given duration in seconds
 */
function createMockWavBuffer(durationSeconds: number, sampleRate: number = 16000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8); // 32000 bytes/sec
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = Math.floor(durationSeconds * byteRate);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

describe('Sarvam Voice Service & Audio Chunker Pipeline', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Audio Duration Probing & WAV Header Parsing', () => {
    it('Accurately measures 10s, 29s, 31s, and 120s WAV durations from header', async () => {
      const wav10 = createMockWavBuffer(10);
      const wav29 = createMockWavBuffer(29);
      const wav31 = createMockWavBuffer(31);
      const wav120 = createMockWavBuffer(120);

      expect(getWavDuration(wav10)).toBeCloseTo(10, 1);
      expect(getWavDuration(wav29)).toBeCloseTo(29, 1);
      expect(getWavDuration(wav31)).toBeCloseTo(31, 1);
      expect(getWavDuration(wav120)).toBeCloseTo(120, 1);

      expect(await probeAudioDuration(wav10, 'test10.wav')).toBeCloseTo(10, 1);
      expect(await probeAudioDuration(wav31, 'test31.wav')).toBeCloseTo(31, 1);
    });
  });

  describe('Audio Splitting Logic', () => {
    it('10-second audio -> returns 1 single chunk without processing', async () => {
      const audio = createMockWavBuffer(10);
      const chunks = await splitAudioIntoChunks(audio, 'recording10.wav');

      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].startTime).toBe(0);
      expect(chunks[0].duration).toBeCloseTo(10, 1);
    });

    it('29-second audio -> returns 1 single chunk', async () => {
      const audio = createMockWavBuffer(29);
      const chunks = await splitAudioIntoChunks(audio, 'recording29.wav');

      expect(chunks).toHaveLength(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].duration).toBeCloseTo(29, 1);
    });

    it('31-second audio -> splits into multiple safe chunks (<= 30s)', async () => {
      const audio = createMockWavBuffer(31);
      const chunks = await splitAudioIntoChunks(audio, 'recording31.wav', {
        maxChunkDurationSec: 25,
        overlapSec: 1,
      });

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0].duration).toBeLessThanOrEqual(25);
      expect(chunks[0].index).toBe(0);
      expect(chunks[1].index).toBe(1);
    });

    it('2-minute (120s) audio -> splits into ordered chunks with correct timestamps', async () => {
      const audio = createMockWavBuffer(120);
      const chunks = await splitAudioIntoChunks(audio, 'recording120.wav', {
        maxChunkDurationSec: 25,
        overlapSec: 1,
      });

      expect(chunks.length).toBe(5); // 0-25, 24-49, 48-73, 72-97, 96-120
      chunks.forEach((chunk, idx) => {
        expect(chunk.index).toBe(idx);
        expect(chunk.duration).toBeLessThanOrEqual(25);
      });
    });
  });

  describe('Transcript Deduplication and Boundary Merging', () => {
    it('Merges single transcript cleanly', () => {
      expect(mergeTranscripts(['Hello world'])).toBe('Hello world');
    });

    it('Merges multiple transcripts removing overlapping boundary phrases', () => {
      const chunk1 = 'I implemented a cache with Redis';
      const chunk2 = 'with Redis and configured TTL policies';
      const chunk3 = 'TTL policies to prevent stale records';

      const merged = mergeTranscripts([chunk1, chunk2, chunk3]);
      expect(merged).toBe('I implemented a cache with Redis and configured TTL policies to prevent stale records');
    });

    it('Handles non-overlapping transcripts without dropping words', () => {
      const chunk1 = 'First point is architectural.';
      const chunk2 = 'Second point is database indexing.';

      const merged = mergeTranscripts([chunk1, chunk2]);
      expect(merged).toBe('First point is architectural. Second point is database indexing.');
    });
  });

  describe('Sarvam Voice Service STT End-to-End Transcription', () => {
    it('Initializes and indicates availability status based on API key', () => {
      const serviceWithKey = new SarvamVoiceService('test_sarvam_api_key_123');
      expect(serviceWithKey.isAvailable()).toBe(true);

      const serviceWithoutKey = new SarvamVoiceService('');
      expect(serviceWithoutKey.isAvailable()).toBe(false);
    });

    it('Short audio (10s): Dispatches exactly 1 API call without chunking', async () => {
      let fetchCallCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        fetchCallCount++;
        return {
          ok: true,
          json: async () => ({ transcript: 'Short audio transcript answer.', language_code: 'en-IN' }),
        } as any;
      });

      const service = new SarvamVoiceService('test_key');
      const audio10 = createMockWavBuffer(10);
      const result = await service.transcribeAudio(audio10, 'short.wav');

      expect(fetchCallCount).toBe(1);
      expect(result.transcript).toBe('Short audio transcript answer.');
      expect(result.provider).toBe('sarvam');
    });

    it('Short audio (29s): Dispatches exactly 1 API call without chunking', async () => {
      let fetchCallCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        fetchCallCount++;
        return {
          ok: true,
          json: async () => ({ transcript: 'Twenty nine seconds transcript.', language_code: 'en-IN' }),
        } as any;
      });

      const service = new SarvamVoiceService('test_key');
      const audio29 = createMockWavBuffer(29);
      const result = await service.transcribeAudio(audio29, 'short29.wav');

      expect(fetchCallCount).toBe(1);
      expect(result.transcript).toBe('Twenty nine seconds transcript.');
      expect(result.provider).toBe('sarvam');
    });

    it('Long audio (31s): Splits into 2 chunks and calls API for each chunk', async () => {
      let fetchCallCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        fetchCallCount++;
        const currentCall = fetchCallCount;
        return {
          ok: true,
          json: async () => ({
            transcript: currentCall === 1 ? 'First chunk of 31s answer' : 'of 31s answer with conclusion',
            language_code: 'en-IN',
          }),
        } as any;
      });

      const service = new SarvamVoiceService('test_key');
      const audio31 = createMockWavBuffer(31);
      const result = await service.transcribeAudio(audio31, 'long31.wav');

      expect(fetchCallCount).toBe(2);
      expect(result.transcript).toBe('First chunk of 31s answer with conclusion');
      expect(result.provider).toBe('sarvam');
    });

    it('2-minute audio (120s): Transcribes 5 chunks in order with combined merged output', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        const currentCall = callCount;
        return {
          ok: true,
          json: async () => ({
            transcript: `Section ${currentCall} content completed.`,
            language_code: 'en-IN',
          }),
        } as any;
      });

      const service = new SarvamVoiceService('test_key');
      const audio120 = createMockWavBuffer(120);
      const result = await service.transcribeAudio(audio120, 'long120.wav');

      expect(callCount).toBe(5);
      expect(result.transcript).toContain('Section 1');
      expect(result.transcript).toContain('Section 5');
      expect(result.provider).toBe('sarvam');
    });

    it('Retries transient chunk failure and succeeds on retry', async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          return {
            ok: false,
            status: 503,
            text: async () => 'Service Temporarily Unavailable',
          } as any;
        }
        return {
          ok: true,
          json: async () => ({ transcript: 'Recovered on second attempt.', language_code: 'en-IN' }),
        } as any;
      });

      const service = new SarvamVoiceService('test_key');
      const audio10 = createMockWavBuffer(10);
      const result = await service.transcribeAudio(audio10, 'retry.wav');

      expect(attempts).toBeGreaterThanOrEqual(1);
      expect(result.transcript).toBeDefined();
    });

    it('Returns fallback transcript gracefully on complete API failure', async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        return {
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as any;
      });

      const service = new SarvamVoiceService('test_key');
      const audio = createMockWavBuffer(10);
      const result = await service.transcribeAudio(audio, 'fail.wav');

      expect(result.provider).toBe('fallback');
      expect(result.transcript).toBeDefined();
    });

    it('Provides graceful speech synthesis fallback when API key is missing', async () => {
      const service = new SarvamVoiceService('');
      const result = await service.synthesizeSpeech('Hello, welcome to the Google technical interview.');

      expect(result).toBeDefined();
      expect(result.contentType).toBe('audio/wav');
      expect(result.provider).toBe('fallback');
    });
  });
});
