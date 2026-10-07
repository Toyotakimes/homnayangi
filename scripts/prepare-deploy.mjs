import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim()
// Read both local and remote tags; never force-fetch, rewrite or remove history.
const remote = git(['ls-remote', '--tags', 'origin'])
const local = git(['tag', '--list', 'deploy-*'])
const numbers = [...`${remote}\n${local}`.matchAll(/(?:refs\/tags\/)?deploy-(\d+)(?:\^\{\})?(?=\s|$)/g)].map(m => Number(m[1]))
const latest = Math.max(0, ...numbers)
const filename = 'src/deploy-version.json'
const pending = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : null
const deploy = Math.max(latest + 1, pending?.deploy || 0)
const data = { deploy, tag: `deploy-${deploy}`, date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()) }
fs.writeFileSync(filename, JSON.stringify(data, null, 2) + '\n')
console.log(JSON.stringify({ latestDeploy: latest, prepared: data }))
