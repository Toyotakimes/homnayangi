import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
const version = JSON.parse(fs.readFileSync('src/deploy-version.json', 'utf8'))
if (!Number.isInteger(version.deploy) || version.deploy < 1 || version.tag !== `deploy-${version.deploy}`) throw new Error('Invalid deploy-version.json')
const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim()
const title = git(['log', '-1', '--format=%s'])
const number = title.match(/^Deploy (\d+) - /)?.[1]
const tagged = git(['tag', '--list', version.tag])
const dirty = Boolean(git(['status', '--porcelain']))
const releasing = process.argv.includes('--release')
if (number && Number(number) !== version.deploy && (releasing || Number(number) + 1 !== version.deploy || !dirty || tagged)) throw new Error('Deploy number does not match the current commit or next pending change group')
if (tagged && git(['rev-parse', `${version.tag}^{commit}`]) !== git(['rev-parse', 'HEAD'])) throw new Error('Version tag points to another commit; prepare the next Deploy before committing changes')
if (tagged && dirty) throw new Error('Tagged Deploy source has changed; prepare the next Deploy before building new changes')
if (releasing && (!number || !tagged || dirty)) throw new Error('Release requires a clean numbered Deploy commit and its matching tag')
console.log(`Version verified: Deploy ${version.deploy} (${version.tag})`)
