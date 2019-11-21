import Octokit from '@octokit/rest'

const GITHUB_PAT = process.env.GITHUB_PAT

/**
 * @module gitkit
 */

/**
 * The Gitkit class
 * @class
 */
class Gitkit {
  /**
   * Create an instance of Gitkit class
   *
   * @param {Object} config the gitkit config options
   * @param {String} config.auth the personal access token
   */
  constructor (conf) {
    this.gitkit = Octokit(Object.assign({}, { auth: GITHUB_PAT }, conf))
  }

  /**
   * Create issue if not already created
   *
   * @param {Object} obj the issue object object
   * @returns {Number} The issue number which is created or to be assigned
   */
  async createIssue (obj) {
    return (await this.gitkit.issues.create(obj)).number
  }
}

const gitkit = new Gitkit()

export { Gitkit, gitkit }
export default gitkit
