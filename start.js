const { spawn, execSync } = require('child_process');

// Starte Docker
console.log('Starting Docker...');
execSync('npm run docker:up', { stdio: 'inherit' });

// Starte Backend
console.log('Starting backend...');
const backend = spawn('npm', ['run', 'start:backend'], {
  stdio: 'inherit',
  shell: true
});

// Starte Frontend
console.log('Starting frontend...');
const frontend = spawn('npm', ['run', 'start:frontend'], {
  stdio: 'inherit',
  shell: true
});

// Bei Abbruch (Ctrl+C) stoppe Docker
process.on('SIGINT', () => {
  console.log('\nStopping Docker...');
  backend.kill();
  frontend.kill();
  try {
    execSync('npm run docker:down', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error stopping Docker:', error.message);
  }
  process.exit(0);
});

// Warte auf die Prozesse
backend.on('close', (code) => {
  console.log(`Backend exited with code ${code}`);
  frontend.kill();
  execSync('npm run docker:down', { stdio: 'inherit' });
});

frontend.on('close', (code) => {
  console.log(`Frontend exited with code ${code}`);
  backend.kill();
  execSync('npm run docker:down', { stdio: 'inherit' });
});