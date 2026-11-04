import fs from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const destination = fileURLToPath(new URL('../server/adminCredentials.ts', import.meta.url));
if (fs.existsSync(destination)) {
  console.log('Private admin credential is already configured; keeping it unchanged.');
  process.exit(0);
}

async function readPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (!process.stdin.isTTY) throw new Error('Run in a terminal or set ADMIN_PASSWORD in this process environment.');
  process.stdout.write('Fixed admin password (hidden): ');
  return new Promise((resolve, reject) => {
    const characters = [];
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    const finish = () => { process.stdin.off('data', input); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); };
    const input = chunk => {
      for (const character of chunk) {
        if (character === '\u0003') { finish(); reject(new Error('Setup cancelled.')); return; }
        if (character === '\r' || character === '\n') { finish(); resolve(characters.join('')); return; }
        if (character === '\u007f' || character === '\b') { if (characters.length) { characters.pop(); process.stdout.write('\b \b'); } }
        else if (character >= ' ') { characters.push(character); process.stdout.write('*'); }
      }
    };
    process.stdin.on('data', input);
  });
}

try {
  const password = await readPassword();
  if (password.length < 8 || Buffer.byteLength(password) > 256) throw new Error('Password must be at least 8 characters and no more than 256 bytes.');
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  const template = fs.readFileSync(new URL('../server/adminCredentials.template.ts', import.meta.url), 'utf8');
  const code = template.replaceAll('__ADMIN_PASSWORD_SALT__', salt.toString('hex')).replaceAll('__ADMIN_PASSWORD_HASH__', hash.toString('hex'));
  fs.writeFileSync(destination, code, { flag: 'wx', mode: 0o600 });
  console.log('Fixed admin credential configured locally. The private file is excluded from Git.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Admin setup failed.');
  process.exitCode = 1;
}
