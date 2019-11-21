import fs from 'fs'
import { promisify } from 'util'
import { exec } from 'child_process'

import pkg from '../package.json'

import { Release } from './release'
import gitkit from './gitkit'

const TODO_PATH = 'TODO.md'
const writeFile = promisify(fs.writeFile)
const execute = promisify(exec)
let currRelease

/**
 * @module todo
 */

/**
 * The Todo class
 * @class
 */
class Todo {
  /**
   * Create an instance of Todo class
   *
   * @param {Object} config the task config options
   * @param {String} config.repo the repo name
   * @param {String} config.owner the owner of repo
   * @param {String} config.title the title of issue
   * @param {String} config.label the label to labelled,
   *                    eg ToBeFixed, ToBeAdded, ToBeRemoved, ToBeChanged
   * @param {String} config.release the release with which issue will be assigned
   * @param {String} config.homepage the homepage of repo to create links
   * @param {String} config.todoPath the path of todo file
   * @param {Number} [issueNumber] the issue number which to be assigned to issue
   */
  constructor (config, issueNumber) {
    Object.assign(this, config)
    this.todoPath = this.todoPath || TODO_PATH
    this.issueNumber = issueNumber
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
   * Create issue if not already created
   *
   * @returns {Number} The issue number which is created or to be assigned
   */
  async createIssue () {
    if (!this.issueNumber) {
      this.issueNumber = await gitkit.createIssue({
        owner: this.owner,
        repo: this.repo,
        title: this.title,
        labels: ['ToBe' + this.label, this.release]
      })
    }
    return this.issueNumber
  }

  /**
   * Append the todo task into TODO file
   *
   * @param {String} release the release number
   * @param {Number} issueNumber the issue number
   * @returns {Promise}
   */
  appendIntoTODO (release, issueNumber) {
    let currentTODO = fs.readFileSync(this.todoPath).toString()
    if (currentTODO.indexOf('- [' + release + '-' + issueNumber + ']') !== -1) return
    if (currentTODO.indexOf('\n\n\n') === -1) {
      currentTODO += '\n\n\n'
    }
    const allSps = currentTODO.split('\n\n\n')
    const sps = allSps[0].split('\n')
    const linkSps = allSps[1].split('\n')
    const ln = sps.length
    linkSps.push('  [' + release + '-' + issueNumber + ']: ' + this.homepage + '/issues/' + issueNumber)
    if (currentTODO.indexOf('## [' + release + ']') === -1) {
      sps.splice(2, 0, '',
        '## [' + release + ']',
        '### To Be ' + this.label,
        '- [' + release + '-' + issueNumber + '] ' + this.title
      )
      linkSps.push('  [' + release + ']: ' + this.homepage + '/tree/' + release)
    } else {
      let k, j
      let noL = false
      for (k = 0; k < ln; k++) {
        if (sps[k].indexOf('## [' + release + ']') === 0) {
          break
        }
      }
      for (j = k; j < ln; j++) {
        if (sps[j] === '') {
          noL = true
          break
        }
        if (sps[j].indexOf('### To Be ' + this.label) === 0) {
          break
        }
      }
      if (noL || j >= ln) {
        sps.splice(k + 1, 0,
          '### To Be ' + this.label,
          '- [' + release + '-' + issueNumber + '] ' + this.title
        )
      } else {
        sps.splice(j + 1, 0,
          '- [' + release + '-' + issueNumber + '] ' + this.title)
      }
    }
    return writeFile(
      'TODO.md',
      sps.join('\n') +
        '\n\n\n' +
        linkSps.sort((a, b) =>
          a.substr(0, a[9] === '-' ? 20 : 9) < b.substr(0, b[9] === '-' ? 20 : 9)
            ? -1
            : 1
        ).join('\n')
    )
  }

  /**
   * The main function to trigger adding task to TODO
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

export { Todo }
