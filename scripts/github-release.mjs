import fs from 'node:fs'
import { spawnSync, execFileSync } from 'node:child_process'
const owner = 'Toyotakimes', repo = 'homnayangi'
const mode = process.argv[2] || 'inspect'
const result = spawnSync('git', ['-c', 'credential.interactive=never', 'credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' } })
if (result.status !== 0) throw new Error('GitHub credential unavailable; authentication is required')
const credential = Object.fromEntries(result.stdout.trim().split('\n').map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)] }))
if (!credential.password) throw new Error('No GitHub credential found')
const headers = { Authorization: `Bearer ${credential.password}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'homnayangi-deploy' }
const base = `https://api.github.com/repos/${owner}/${repo}`
async function api(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...headers, ...options.headers } })
  if (response.status === 404) return null
  const data = await response.json()
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}: ${data.message || 'request failed'}`)
  return data
}
if (mode === 'inspect') {
  const [repository, releases, pages] = await Promise.all([api(''), api('/releases?per_page=100'), api('/pages')])
  console.log(JSON.stringify({ permissions: repository?.permissions, releases: releases?.map(r => ({ tag: r.tag_name, title: r.name, url: r.html_url })), pages: pages && { url: pages.html_url, status: pages.status } }, null, 2))
} else {
  const version = JSON.parse(fs.readFileSync('src/deploy-version.json', 'utf8'))
  const sha = execFileSync('git', ['rev-parse', `${version.tag}^{commit}`], { encoding: 'utf8' }).trim()
  if (mode === 'create') {
    let release = await api(`/releases/tags/${version.tag}`)
    if (!release) release = await api('/releases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag_name: version.tag, target_commitish: sha, name: `Deploy ${version.deploy}`, body: fs.readFileSync(`releases/${version.tag}.md`, 'utf8') + `\nCommit: ${sha}\n`, draft: false, prerelease: false }) })
    else if (release.name !== `Deploy ${version.deploy}`) throw new Error('Existing release differs; refusing to overwrite')
    console.log(JSON.stringify({ releaseId: release.id, url: release.html_url, tag: release.tag_name }))
  } else if (mode === 'upload') {
    const release = await api(`/releases/tags/${version.tag}`)
    if (!release) throw new Error('Release does not exist')
    const filename = `${version.tag}.tar.gz`
    if (release.assets.some(a => a.name === filename)) { console.log('Existing version archive preserved'); process.exit(0) }
    const response = await fetch(release.upload_url.replace(/\{.*$/, '') + '?name=' + filename, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/gzip' }, body: fs.readFileSync(process.argv[3]) })
    const data = await response.json()
    if (!response.ok) throw new Error(`GitHub upload HTTP ${response.status}: ${data.message}`)
    console.log(JSON.stringify({ archive: data.browser_download_url, bytes: data.size }))
  } else if (mode === 'status') {
    const [release, runs, pages] = await Promise.all([api(`/releases/tags/${version.tag}`), api(`/actions/runs?head_sha=${sha}`), api('/pages')])
    console.log(JSON.stringify({ release: release?.html_url, runs: runs?.workflow_runs?.map(r => ({ id: r.id, status: r.status, conclusion: r.conclusion, url: r.html_url })), pages: pages?.html_url }, null, 2))
  }
}
