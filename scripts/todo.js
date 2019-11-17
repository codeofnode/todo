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
if (process.argv[argvLength - 1].split('.').length !== 3) {
  title = process.argv.slice(1).join(' ')
  process.argv[4] = 0
}

switch (label) {
  case 'a': label = 'Added'; break
  case 'b': label = 'Bug'; break
  case 'c': label = 'Changed'; break
  case 'r': label = 'Removed'; break
  default :
    console.log('Invalid type')
    process.exit(1)
}

const createIssue = function () {
  console.log({
    owner,
    repo: pkg.name,
    title: label,
    labels: [label]
  })
  return 101
  // return octokit.issues.create({
  //  owner,
  //  repo: pkg.name,
  //  title: label,
  //  labels: [label]
  // })
}

const getRelease = async function () {
  if (process.argv[4]) return process.argv[4]
  const release = (await execute('git symbolic-ref --short HEAD')).stdout
  const sps = release.split('-').pop().split('.')
  if (sps.length !== 3) {
    console.log('Release not found from branch ' + release)
    process.exit(1)
  }
  return sps.join('.')
}

const appendIntoTODO = async function (release, issueNumber) {
  let currentTODO = fs.readFileSync('TODO.md').toString()
  if (currentTODO.indexOf('\n\n\n') === -1) {
    currentTODO += '\n\n\n'
  }
  const allSps = currentTODO.split('\n\n\n')
  const sps = allSps[0].split('\n')
  const linkSps = allSps[1].split('\n')
  const ln = sps.length
  linkSps.push('  [' + release + '-' + issueNumber + ']: ' + pkg.homepage + '/issues/' + issueNumber)
  if (currentTODO.indexOf('## [' + release + ']') === -1) {
    sps.splice(3, 0, '', '',
      '## [' + release + ']',
      '### ' + label,
      '- [' + release + '-' + issueNumber + '] ' + title
    )
    linkSps.push('  [' + release + ']: ' + pkg.homepage + '/tree/' + release)
  } else {
    let k, j
    for (k = 0; k < ln; k++) {
      if (sps[k].indexOf('## [' + release + ']') === 0) {
        break
      }
    }
    for (j = k; j < ln; j++) {
      if (sps[j].indexOf('### ' + label) === 0) {
        break
      }
    }
    if (j >= ln) {
      sps.splice(j, 0, '',
        '### ' + label,
        '- [' + release + '-' + issueNumber + '] ' + title)
    } else {
      sps.splice(j, 0,
        '- [' + release + '-' + issueNumber + '] ' + title)
    }
  }
  await Promise.all([
    writeFile('TODO.md', sps.join('\n') + '\n\n\n' + linkSps.sort().join('\n'))
  ])
}

async function main () {
  const currRelease = await getRelease()
  await execute('git checkout ' + currRelease)
  const issueNumber = await createIssue()
  await execute('git checkout -b ' + currRelease + '-' + issueNumber)
  // await execute('git push origin ' + currRelease + '-' + issueNumber + ':' + currRelease + '-' + issueNumber)
  return appendIntoTODO(currRelease, issueNumber)
}

main()
