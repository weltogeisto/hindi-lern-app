const fs = require('fs');
const path = require('path');

function writeWav(filePath, durationSeconds = 0.4, sampleRate = 22050) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = numSamples * numChannels * bitsPerSample / 8;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset); offset += 4; // file length - 8
  buffer.write('WAVE', offset); offset += 4;
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // subchunk1size (16 for PCM)
  buffer.writeUInt16LE(1, offset); offset += 2; // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // silence (zeros)
  // buffer already zero-filled

  fs.writeFileSync(filePath, buffer);
}

const outDir = path.join(__dirname, '..', 'public', 'audio');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const names = ['aa','i','ee','u','oo','e','ai','o','au','ka','kha','ga','gha','nga','placeholder'];
for (const name of names) {
  const p = path.join(outDir, `${name}.wav`);
  try {
    writeWav(p);
    console.log('wrote', p);
  } catch (e) {
    console.error('failed', p, e.message);
  }
}
