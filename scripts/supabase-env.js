/**
 * Loads SUPABASE_PROJECT_REF from .env (if present) and runs Supabase CLI commands.
 * Keeps the project ref out of version-controlled scripts.
 */
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

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

const cmd = process.argv[2];
if (cmd === 'link') {
  execSync(`npx supabase link --project-ref ${ref}`, { stdio: 'inherit', cwd: root });
} else if (cmd === 'push') {
  execSync('npx supabase db push', { stdio: 'inherit', cwd: root });
} else if (cmd === 'setup') {
  execSync(`npx supabase link --project-ref ${ref}`, { stdio: 'inherit', cwd: root });
  execSync('npx supabase db push', { stdio: 'inherit', cwd: root });
} else {
  console.error('Usage: node supabase-env.js <link|push|setup>');
  process.exit(1);
}
