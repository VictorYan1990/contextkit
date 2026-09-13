#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { parse } = require('../lib/args');
const log = require('../lib/log');
const paths = require('../lib/paths');

const COMMANDS = {
  init: require('../commands/init'),
  install: require('../commands/install'),
  add: require('../commands/add'),
  remove: require('../commands/remove'),
  update: require('../commands/update'),
  eject: require('../commands/eject'),
  exclude: require('../commands/exclude'),
  restore: require('../commands/restore'),
  list: require('../commands/list'),
  doctor: require('../commands/doctor'),
  'new-module': require('../commands/new-module'),
  validate: require('../commands/validate'),
};

function help() {
  const pkg = require(path.join(paths.CLI_ROOT, 'package.json'));
  console.log(`contextkit ${pkg.version} — importable context infrastructure for AI coding agents\n`);
  console.log('usage: contextkit <command> [options]\n');
  for (const [name, c] of Object.entries(COMMANDS)) console.log(`  ${c.usage.padEnd(70)}\n      ${c.summary}`);
  console.log('\nglobal options: --root <dir> (consumer root; default: git top level of cwd), --quiet, --debug');
}

function main(argv) {
  const { command, positionals, flags } = parse(argv);
  if (flags.version) {
    console.log(require(path.join(paths.CLI_ROOT, 'package.json')).version);
    return 0;
  }
  if (!command || flags.help || command === 'help') {
    help();
    return command || flags.help ? 0 : 1;
  }
  const cmd = COMMANDS[command];
  if (!cmd) {
    log.fail(`unknown command "${command}"`);
    help();
    return 1;
  }
  if (flags.quiet) log.setQuiet(true);
  const cwd = process.cwd();
  const root = paths.findRoot(cwd, flags.root);
  return cmd.run({ root, cwd, positionals, flags });
}

try {
  const code = main(process.argv.slice(2));
  process.exitCode = typeof code === 'number' ? code : 0;
} catch (err) {
  log.fail(err.message);
  if (process.env.CONTEXTKIT_DEBUG || process.argv.includes('--debug')) console.error(err.stack);
  process.exitCode = 1;
}
