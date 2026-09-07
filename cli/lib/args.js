'use strict';

// Flags that never take a value.
const BOOLEAN = new Set([
  'all', 'available', 'strict', 'help', 'version', 'offline', 'force', 'json',
  'no-doctor', 'no-commit', 'quiet', 'debug',
]);
// Flags that may repeat.
const MULTI = new Set(['with']);

/** Minimal argv parser: `cmd pos1 pos2 --flag value --bool --multi a --multi b`. */
function parse(argv) {
  const out = { command: null, positionals: [], flags: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') {
      out.positionals.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      let key = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
      let val = eq === -1 ? undefined : arg.slice(eq + 1);
      if (val === undefined) {
        if (BOOLEAN.has(key)) {
          val = true;
        } else {
          const next = argv[i + 1];
          if (next !== undefined && !next.startsWith('--')) {
            val = next;
            i += 1;
          } else {
            val = true;
          }
        }
      }
      if (MULTI.has(key)) {
        (out.flags[key] = out.flags[key] || []).push(val);
      } else {
        out.flags[key] = val;
      }
    } else if (out.command === null) {
      out.command = arg;
    } else {
      out.positionals.push(arg);
    }
  }
  return out;
}

module.exports = { parse };
