import fs from 'fs'
import { promisify } from 'util'
import j2s from 'json2server'
import pkg from '../package.json'

const replace = j2s.methods.replace
const writeFile = promisify(fs.writeFile)


async function main() {
  delete pkg.devDependencies;
  delete pkg.scripts;
  delete pkg.nyc;
  delete pkg.babel;
  pkg.scripts = { start: 'node server.js' };
  await Promise.all([
    writeFile('dist/package.json', JSON.stringify(pkg, undefined, 2)),
  ]);
}

main();
