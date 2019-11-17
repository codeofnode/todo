import fs from 'fs'
import { promisify } from 'util'
import { utils } from 'templist'

import pkg from '../package.json'

const writeFile = promisify(fs.writeFile)

/**
 * The function to build package.json for builds
 *
 */
async function dist () {
  delete pkg.devDependencies
  delete pkg.scripts
  delete pkg.nyc
  delete pkg.babel
  pkg.scripts = { start: 'node bin.js' }
  pkg.bin = { [pkg.name]: 'bin.js' }
  await Promise.all([
    writeFile('dist/package.json', JSON.stringify(pkg, undefined, 2) + '\n')
  ])
}

/**
 * Reset the app config
 *
 */
async function reset () {
  let cnf = (({
    name, description, version, keywords, homepage
  }) => ({
    name, description, version, keywords, homepage
  }))(pkg)
  cnf = { app: cnf }
  utils.assign(cnf, pkg.config)
  fs.readdirSync('src')
    .filter(sec => !sec.startsWith('.') && !sec.endsWith('app') && !sec.endsWith('.json') && !sec.endsWith('.js'))
    .forEach(ky => {
      cnf[ky] = {}
    })
  await Promise.all([
    writeFile('src/app/config.json', JSON.stringify(cnf, undefined, 2) + '\n')
  ])
}

/**
 * The main start function for development
 *
 */
async function main () {
  try {
    await fs.promises.access('src/app/config.json')
  } catch (er) {
    await reset()
  }
}

if (process.argv[2] === 'dist') {
  dist()
} else if (process.argv[2] === 'reset') {
  reset()
} else {
  main()
}
