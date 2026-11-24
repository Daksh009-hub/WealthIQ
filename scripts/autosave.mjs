// scripts/autosave.mjs — checkpoint commit + push every N minutes if the tree is dirty.
// Honest timestamps, never force-pushes. Meaningful commits by the agent remain the primary history.
import { execSync } from 'node:child_process';

const mins = Number(process.argv[2] || 20);
const sh = (cmd) => execSync(cmd, { stdio: 'pipe' }).toString().trim();

function tick() {
  try {
    if (!sh('git status --porcelain')) return console.log('[autosave] clean, nothing to do');
    sh('git add -A');
    const stat = sh('git diff --cached --shortstat');
    const t = new Date().toTimeString().slice(0, 5);
    sh(`git commit -m "chore(autosave): checkpoint ${t}" -m "${stat}"`);
    sh('git push origin HEAD');
    console.log(`[autosave] pushed checkpoint at ${t}`);
  } catch (e) {
    console.error('[autosave] skipped this cycle:', e.message.split('\n')[0]);
  }
}
console.log(`[autosave] running every ${mins} min`);
setInterval(tick, mins * 60 * 1000);
