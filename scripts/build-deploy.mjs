import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import './check-deploy-version.mjs'
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { stdio: 'inherit' })
const version = JSON.parse(fs.readFileSync('src/deploy-version.json', 'utf8'))
const commitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
fs.writeFileSync('dist/deploy-version.json', JSON.stringify({ ...version, commitSha }, null, 2) + '\n')
