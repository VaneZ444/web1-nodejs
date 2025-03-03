const { spawn } = require('child_process');

// Команды для запуска сервисов
const commands = [
  { name: 'gateway', command: 'node', args: ['gateway/app.js'] },
  { name: 'units', command: 'node', args: ['units/app.js'] },
  { name: 'fileStorage', command: 'node', args: ['fileStorage/app.js'] },
  { name: 'log', command: 'node', args: ['log/app.js'] },
];

// Запуск сервисов
commands.forEach((cmd) => {
  const child = spawn(cmd.command, cmd.args, { stdio: 'inherit' });

  child.on('error', (err) => {
    console.error(`[${cmd.name}] Error: ${err.message}`);
  });

  child.on('close', (code) => {
    console.log(`[${cmd.name}] Process exited with code ${code}`);
  });
});