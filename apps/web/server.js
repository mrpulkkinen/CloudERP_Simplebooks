const { existsSync } = require('fs');
const { join } = require('path');

const baseDir = __dirname;
const standaloneDir = join(baseDir, '.next', 'standalone');
const candidates = [
  join(standaloneDir, 'server.js'),
  join(standaloneDir, 'apps', 'web', 'server.js')
];

for (const candidate of candidates) {
  if (existsSync(candidate)) {
    require(candidate);
    return;
  }
}

console.error('Unable to locate Next.js standalone server entry. Did you run `next build`?');
process.exit(1);
