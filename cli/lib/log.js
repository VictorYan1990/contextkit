'use strict';

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);

let quiet = false;

module.exports = {
  setQuiet(v) { quiet = Boolean(v); },
  info(m) { if (!quiet) console.log(m); },
  step(m) { if (!quiet) console.log(`${paint(36, '->')} ${m}`); },
  ok(m) { if (!quiet) console.log(`${paint(32, 'ok')}   ${m}`); },
  warn(m) { console.log(`${paint(33, 'warn')} ${m}`); },
  fail(m) { console.log(`${paint(31, 'FAIL')} ${m}`); },
  dim(m) { if (!quiet) console.log(paint(90, m)); },
};
