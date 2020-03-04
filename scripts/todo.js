import fs from 'fs'
import { promisify } from 'util'

import pkg from '../package.json'
import { Git } from './git'
import { gitkit } from './gitkit'

const TODO_PATH = 'TODO.md'
const writeFile = promisify(fs.writeFile)
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
        labels: [this.label, this.release]
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
        '### ' + this.label,
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
        if (sps[j].indexOf('### ' + this.label) === 0) {
          break
        }
      }
      if (noL || j >= ln) {
        sps.splice(k + 1, 0,
          '### ' + this.label,
          '- [' + release + '-' + issueNumber + '] ' + this.title
        )
      } else {
        sps.splice(j + 1, 0,
          '- [' + release + '-' + issueNumber + '] ' + this.title)
      }
    }
    return writeFile(
      this.todoPath,
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
    await Git.checkout(currRelease + '-' + issueNumber, currRelease)
    return this.appendIntoTODO(currRelease, issueNumber)
  }
}

if (require.main === module) {
  const owner = pkg.homepage.split('/')[3]
  const repo = pkg.homepage.split('/')[4]
  let title = process.argv[3]
  const argvLength = process.argv.length
  if (process.argv[argvLength - 1].split('.').length !== 3 && process.argv[4].split(' ').length > 1) {
    title = process.argv.slice(3).join(' ')
    process.argv[4] = 0
  }
  let label = process.argv[2]
  switch (label) {
    case 'a': label = 'Additions'; break
    case 'f': label = 'Fixes'; break
    case 'c': label = 'Changes'; break
    case 'd': label = 'Removals'; break
    default :
      console.log('Invalid type')
      process.exit(1)
  }
  currRelease = process.argv[4] || Git.getCurrRelease()
  const task = new Todo({
    owner, title, repo, label, release: currRelease, homepage: pkg.homepage
  }, process.argv[5])
  task.main()
}

export { Todo }
export default Todo
