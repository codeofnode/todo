import { exec } from 'child_process'
import { promisify } from 'util'

const execute = promisify(exec)

/**
 * @module git
 */

/**
 * The Git class
 * @class
 */
class Git {
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
   * checkout to different branch
   *
   * @param {String} branchname the branch name to switch on
   */
  static switchBranch (branchname) {
    return execute('git checkout -b ' + branchname)
  }
}

export { Git }
export default Git
