// Reuse the exact Release archive for old versions rather than rebuilding them.
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const version = JSON.parse(await fs.readFile('src/deploy-version.json', 'utf8'))
const stage = path.resolve('pages-build')
await fs.mkdir(stage, { recursive: true })
await fs.cp('dist', stage, { recursive: true })
await fs.mkdir(path.join(stage, 'versions'), { recursive: true })
await fs.cp('dist', path.join(stage, 'versions', version.tag), { recursive: true })
const tags = execFileSync('git', ['tag', '--list', 'deploy-*'], { encoding: 'utf8' }).trim().split('\n').filter(tag => /^deploy-\d+$/.test(tag) && tag !== version.tag)
for (const tag of tags) {
  const headers = { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'homnayangi-version-history' }
  const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/releases/tags/${tag}`, { headers })
  if (!response.ok) throw new Error(`Cannot preserve ${tag}: Release HTTP ${response.status}`)
  const release = await response.json()
  const asset = release.assets.find(asset => asset.name === `${tag}.tar.gz`)
  if (!asset) throw new Error(`Cannot preserve ${tag}: immutable version archive is missing`)
  const download = await fetch(asset.url, { headers: { ...headers, Accept: 'application/octet-stream' } })
  if (!download.ok) throw new Error(`Cannot download ${tag}: HTTP ${download.status}`)
  const temporary = await fs.mkdtemp(path.resolve('.pages-history-'))
  const archive = path.join(temporary, `${tag}.tar.gz`)
  await fs.writeFile(archive, Buffer.from(await download.arrayBuffer()))
  execFileSync('tar', ['-xzf', archive, '-C', temporary])
  const source = path.join(temporary, 'dist')
  const oldVersion = JSON.parse(await fs.readFile(path.join(source, 'deploy-version.json'), 'utf8'))
  const oldSha = execFileSync('git', ['rev-parse', `${tag}^{commit}`], { encoding: 'utf8' }).trim()
  if (oldVersion.tag !== tag || oldVersion.commitSha !== oldSha) throw new Error(`${tag} archive does not match its Git tag`)
  await fs.cp(source, path.join(stage, 'versions', tag), { recursive: true })
}
console.log(`Pages archive includes Deploy ${version.deploy} and ${tags.length} preserved historical version(s).`)
