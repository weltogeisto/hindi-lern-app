const fs = require('fs');
const path = require('path');
const files = ['aa.mp3','i.mp3','ee.mp3','u.mp3','oo.mp3','e.mp3','ai.mp3','o.mp3','au.mp3','ka.mp3','kha.mp3','ga.mp3','gha.mp3','nga.mp3'];
const src = path.join(__dirname, '..', 'public', 'audio', 'placeholder.mp3');
const destDir = path.join(__dirname, '..', 'public', 'audio');
for (const f of files) {
  const dest = path.join(destDir, f);
  try {
    fs.copyFileSync(src, dest);
    console.log('copied', f);
  } catch (e) {
    console.error('failed', f, e.message);
  }
}
console.log('audio files in public/audio:');
console.log(fs.readdirSync(destDir));
