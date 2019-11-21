import fs from 'fs'
import { promisify } from 'util'
import { exec } from 'child_process'

import pkg from '../package.json'
import gitkit from './gitkit'

const CHNGLOG_PATH = 'CHANGELOG.md'
const writeFile = promisify(fs.writeFile)
const execute = promisify(exec)
let currRelease

/**
 * @module release
 */

/**
 * The release class
 * @class
 */
class Release {
  /**
   * Create an instance of Release class
   *
   * @param {Object} config the task config options
   * @param {String} config.homepage the homepage of repo to create links
   * @param {String} config.changelogPath the path of changelog file
   * @param {Todo} todo the todo instance to mange todo file
   */
  constructor (config, todo) {
    Object.assign(this, config)
    this.todo = todo
    this.changelogPath = this.changelogPath || CHNGLOG_PATH
  }

  /**
   * Get the current release from git command
   *
   * @returns {String} the release version
   */
  static async getRelease () {
    const release = (await execute('git symbolic-ref --short HEAD')).stdout
    const sps = release.split('-').shift().split('.')
    if (sps.length !== 3) {
      throw new Error('Release not found from branch ' + release)
    }
    return sps.join('.')
  }

  /**
   * The main function to trigger a release
   *
   */
  async main () {
    const currRelease = this.release
    const issueNumber = await this.createIssue(currRelease)
    await execute('git checkout -b ' + currRelease + '-' + issueNumber + ' ' + currRelease)
    return this.appendIntoTODO(currRelease, issueNumber)
  }
}

if (require.main === module) {
  const owner = pkg.homepage.split('/')[3]
  const repo = pkg.homepage.split('/')[4]
  let title = process.argv[3]
  let label = process.argv[2]
  const argvLength = process.argv.length
  if (process.argv[argvLength - 1].split('.').length !== 3 && process.argv[4].split(' ').length > 1) {
    title = process.argv.slice(3).join(' ')
    process.argv[4] = 0
  }
  switch (label) {
    case 'a': label = 'Added'; break
    case 'f': label = 'Fixed'; break
    case 'c': label = 'Changed'; break
    case 'd': label = 'Removed'; break
    default :
      console.log('Invalid type')
      process.exit(1)
  }
  currRelease = process.argv[4] || Release.getRelease()
  const task = new Todo({
    owner, title, repo, label, release: currRelease, homepage: pkg.homepage
  }, process.argv[5])
  task.main()
}

export { Release }
