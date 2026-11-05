const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
for (const directory of ['desktop', 'ui', 'scripts', 'test']) for (const file of fs.readdirSync(directory)) {
  if (/\.(cjs|js)$/.test(file)) execFileSync(process.execPath, ['--check', path.join(directory, file)], { stdio: 'inherit' });
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.dependencies && Object.keys(pkg.dependencies).length) throw new Error('Unexpected runtime dependency');
console.log('Syntax und Paketstruktur geprüft.');
