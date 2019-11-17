import { join } from 'path'
import readEnv from 'read-env'
import templist from 'templist'

/**
 * @module Application
 */

import config from './config.json'
const assign = templist.utils.assign
const MAIN_APP = 'app'
const mainModuleUpper = config[MAIN_APP].name
  .split('-')
  .join('_')
  .toUpperCase()

assign(config, readEnv(mainModuleUpper))

/**
 * Throw an error
 *
 * @param {String} errCode the error code
 * @param {Boolean} justReturn just return the error, don't throw
 * @param {String} msg the error message
 */
const throwError = function (errCode, msg = 'Error', justReturn = false) {
  const er = new Error(msg)
  er.code = mainModuleUpper + '_' + errCode
  if (justReturn) return er
  throw er
}

/**
 * The Application class
 * @class
 */
class Application {
  /**
   * Create an instance of Application class
   *
   * @param {config} config the global app config options
   */
  constructor (config) {
    this.config = config
    this.modules = Object.keys(config).filter(nm => nm !== MAIN_APP)
    this.AllModules = {}
    this.allModules = {}
  }

  /**
   * The main entry function of the application
   *
   */
  static async main (conf) {
    const app = new Application(conf)
    app.require()
    await app.init()
    await app.start()
    process.on('SIGINT', function () {
      process.stdout.write('Stopping ' + conf.name + ' ...')
      app.stop().then(results => {
        const successExit = results.find(pm => pm.status !== 'fulfilled')
        process.exit(successExit ? 0 : 1)
      })
    })
  }

  /**
   * Require all the modules
   *
   * @param {Array} modules list of modules
   */
  require (modules) {
    (modules || this.modules).forEach(sec => {
      this.AllModules[sec] = require(join(__dirname, sec))
    })
  }

  /**
   * Initialize all modules
   *
   * @param {Array} modules list of modules
   */
  init (modules) {
    (modules || this.modules).forEach(sec => {
      this.config[sec].appConfig = this.config[MAIN_APP]
      this.allModules[sec] = new this.AllModules[sec](this.config[sec])
    })
  }

  /**
   * Start all modules
   *
   * @param {Array} modules list of modules
   */
  start (modules) {
    return Promise.all(
      (modules || this.modules).map(sec => this.allModules[sec].start())
    )
  }

  /**
   * Stop all modules
   *
   * @param {Array} modules list of modules
   */
  stop (modules) {
    return Promise.allSettled(
      (modules || this.modules).map(sec => {
        return new Promise((resolve, reject) => {
          const tm =
            this.allModules[sec].stopTimeout === undefined
              ? 2000
              : this.allModules[sec].stopTimeout
          const tmFunc = function () {
            const msg =
              'Stopping of ' + sec + ' timed out after ' + tm + ' ms!'
            process.stdout.write(msg + '\n')
            reject(throwError('STOP_TIMEDOUT', msg, true))
          }
          setTimeout(tmFunc, tm)
          this.allModules[sec].stop().then(
            function (...pms) {
              clearTimeout(tmFunc)
              resolve(...pms)
            },
            function (er) {
              clearTimeout(tmFunc)
              process.stdout.write(sec + ' could not be stopped!\n')
              process.stdout.write(er, '\n')
              reject(er)
            }
          )
        })
      })
    )
  }

  /**
   * Call a module function with some parameter
   *  Throws error if module or its function not available
   *
   * @param {(String|String[])} name name of the module or array of name of modules
   * @param {String} func name of the function of the module being called
   * @param {Array} ...params parameters to be passed
   * @returns {*} Return any value that is returned by modules function call
   */
  module (name, func, ...params) {
    const results = []
    const isAr = Array.isArray(name)
    const nn = isAr ? name : [name]
    nn.forEach(sec => {
      if (!Object.hasOwnProperty.call(this.allModules, sec)) {
        throwError('MODULE_NOT_FOUND')
      }
      if (typeof this.allModules[sec][func] !== 'function') {
        throwError('MODULE_FUNCTION_NOT_FOUND')
      }
      results.push(this.allModules[sec][func](...params))
    })
    return isAr ? results : results.pop()
  }
}

export { Application, config }
