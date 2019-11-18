import fs from 'fs'
import { promisify } from 'util'
import { exec } from 'child_process'
import Octokit from '@octokit/rest'

import pkg from '../package.json'
const writeFile = promisify(fs.writeFile)
const execute = promisify(exec)

const owner = pkg.homepage.split('/')[3]

const octokit = Octokit({
  auth: process.env.GITHUB_PAT
})

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

const createIssue = function (currRelease) {
  return process.argv[5] || octokit.issues.create({
    owner,
    repo: pkg.name,
    title: title,
    labels: ['ToBe' + label, currRelease]
  })
}

const getRelease = async function () {
  if (process.argv[4]) return process.argv[4]
  const release = (await execute('git symbolic-ref --short HEAD')).stdout
  const sps = release.split('-').shift().split('.')
  if (sps.length !== 3) {
    console.log('Release not found from branch ' + release)
    process.exit(1)
  }
  return sps.join('.')
}

const appendIntoTODO = async function (release, issueNumber) {
  let currentTODO = fs.readFileSync('TODO.md').toString()
  if (currentTODO.indexOf('- [' + release + '-' + issueNumber + ']') !== -1) return
  if (currentTODO.indexOf('\n\n\n') === -1) {
    currentTODO += '\n\n\n'
  }
  const allSps = currentTODO.split('\n\n\n')
  const sps = allSps[0].split('\n')
  const linkSps = allSps[1].split('\n')
  const ln = sps.length
  linkSps.push('  [' + release + '-' + issueNumber + ']: ' + pkg.homepage + '/issues/' + issueNumber)
  if (currentTODO.indexOf('## [' + release + ']') === -1) {
    sps.splice(2, 0, '',
      '## [' + release + ']',
      '### To Be ' + label,
      '- [' + release + '-' + issueNumber + '] ' + title
    )
    linkSps.push('  [' + release + ']: ' + pkg.homepage + '/tree/' + release)
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
      if (sps[j].indexOf('### To Be ' + label) === 0) {
        break
      }
    }
    if (noL || j >= ln) {
      sps.splice(k + 1, 0,
        '### To Be ' + label,
        '- [' + release + '-' + issueNumber + '] ' + title
      )
    } else {
      sps.splice(j + 1, 0,
        '- [' + release + '-' + issueNumber + '] ' + title)
    }
  }
  await Promise.all([
    writeFile(
      'TODO.md',
      sps.join('\n') +
        '\n\n\n' +
        linkSps.sort((a, b) =>
          a.substr(0, a[9] === '-' ? 20 : 9) < b.substr(0, b[9] === '-' ? 20 : 9)
            ? -1
            : 1
        ).join('\n')
    )
  ])
}

async function main () {
  const currRelease = await getRelease()
  const issueNumber = await createIssue(currRelease)
  await execute('git checkout -b ' + currRelease + '-' + issueNumber + ' ' + currRelease)
  return appendIntoTODO(currRelease, issueNumber)
}

main()
