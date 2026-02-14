/**
 * Loads SUPABASE_PROJECT_REF from .env (if present) and runs Supabase CLI commands.
 * Keeps the project ref out of version-controlled scripts.
 */
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*SUPABASE_PROJECT_REF\s*=\s*(.+?)\s*$/);
    if (m) {
      process.env.SUPABASE_PROJECT_REF = m[1].replace(/^["']|["']$/g, '').trim();
      break;
    }
  }
}

const ref = process.env.SUPABASE_PROJECT_REF;
if (!ref) {
  console.error('SUPABASE_PROJECT_REF is not set. Add it to .env or set the environment variable.');
  process.exit(1);
}

const opts = { stdio: 'inherit', cwd: root };
const cmd = process.argv[2];
if (cmd === 'link') {
  const r = spawnSync('npx', ['supabase', 'link', '--project-ref', ref], opts);
  if (r.status !== 0) process.exit(r.status ?? 1);
} else if (cmd === 'push') {
  const r = spawnSync('npx', ['supabase', 'db', 'push'], opts);
  if (r.status !== 0) process.exit(r.status ?? 1);
} else if (cmd === 'setup') {
  const r1 = spawnSync('npx', ['supabase', 'link', '--project-ref', ref], opts);
  if (r1.status !== 0) process.exit(r1.status ?? 1);
  const r2 = spawnSync('npx', ['supabase', 'db', 'push'], opts);
  if (r2.status !== 0) process.exit(r2.status ?? 1);
} else {
  console.error('Usage: node supabase-env.js <link|push|setup>');
  process.exit(1);
}
