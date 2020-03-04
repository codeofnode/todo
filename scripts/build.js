import fs from 'fs'
import { promisify } from 'util'
import templist from 'templist'
import pkg from '../package.json'

const utils = templist.utils

const writeFile = promisify(fs.writeFile)
const DIST_PKG_PATH = 'dist/package.json'
const MB_APP = 'mb-app'
const APP_CNF_PATH = 'src/' + MB_APP + '/config.json'

/**
 * @module build
 */

/**
 * The Build class
 * @class
 */
class Build {
  /**
   * Create an instance of Application class
   *
   * @param {Object} config the build config options
   */
  constructor ({ pkg, distPackagePath = DIST_PKG_PATH, appConfigPath = APP_CNF_PATH }) {
    this.pkg = pkg
    this.packagePath = distPackagePath
    this.appConfigPath = appConfigPath
  }

  /**
   * The function to build package.json for builds
   *
   * @param {Object} pkgObj the pkg object of package.json
   */
  async dist (pkgObj) {
    const pkg = pkgObj || this.pkg
    delete pkg.devDependencies
    delete pkg.scripts
    delete pkg.nyc
    delete pkg.babel
    pkg.scripts = { start: 'node bin.js' }
    pkg.bin = { [pkg.name]: 'bin.js' }
    await Promise.all([
      writeFile(this.packagePath, JSON.stringify(pkg, undefined, 2) + '\n')
    ])
  }

  /**
   * Reset the app config
   *
   * @param {Object} pkgObj the pkg object of package.json
   */
  async reset (pkgObj) {
    const pkg = pkgObj || this.pkg
    let cnf = (({
      name, description, version, keywords, homepage
    }) => ({
      name, description, version, keywords, homepage
    }))(pkg)
    cnf = { [MB_APP]: cnf }
    utils.assign(cnf, pkg.config)
    fs.readdirSync('src')
      .filter(sec => !sec.startsWith('.') && !sec.endsWith('app') &&
        !sec.endsWith('.json') && !sec.endsWith('.js'))
      .forEach(ky => {
        cnf[ky] = {}
      })
    await writeFile(this.appConfigPath, JSON.stringify(cnf, undefined, 2) + '\n')
  }

  /**
   * The main function that creates config if not present
   *
   */
  async main () {
    let res
    try {
      res = await fs.promises.access(this.appConfigPath)
    } catch (er) {
      res = await this.reset()
    }
    return res
  }
}

const build = new Build({ pkg })

if (require.main === module) {
  if (process.argv[2] === 'dist') {
    build.dist()
  } else if (process.argv[2] === 'reset') {
    build.reset()
  } else {
    build.main()
  }
}

export { Build, build }
export default build.main.bind(build)
