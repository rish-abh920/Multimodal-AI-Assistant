/**
 * Decodes a browser-recorded MediaRecorder Blob (e.g. WebM/Opus) via Web Audio API
 * and encodes a standard 16-bit PCM RIFF/WAVE (.wav) File accepted by backend magic-byte validation.
 */
export async function convertBlobToWavFile(blob, filename = `mic_recording_${Date.now()}.wav`) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioCtx();

  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const numChannels = 1; // Mono speech recognition optimal for Whisper
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const numSamples = channelData.length;

    const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(wavBuffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');

    // fmt subchunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // Byte rate
    view.setUint16(32, numChannels * 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample

    // data subchunk
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }

    return new File([wavBuffer], filename, { type: 'audio/wav' });
  } finally {
    await audioCtx.close();
  }
}

