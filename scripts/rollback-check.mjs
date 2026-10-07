import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import version from '../src/deploy-version.json' with { type: 'json' }
const target = 'ba24969d27557ad6c6ad9b570d4bf0e02864f6ea'
const normalize = value => value.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n')
const files = ['src/App.jsx', 'src/data/dishes.json', 'src/styles.css', 'src/utils/dishImageResolver.js', 'src/utils/dishImageResolver.test.js']
for (const file of files) {
  let expected = normalize(execFileSync('git', ['show', `${target}:${file}`], { encoding: 'utf8' }))
  if (file === 'src/App.jsx') expected = expected
    .replace("import React, { useEffect, useMemo, useState } from 'react'", "import React, { useEffect, useMemo, useState } from 'react'\nimport deployVersion from './deploy-version.json'")
    .replace('Ảnh chỉ hiện khi có metadata xác minh đúng món</footer>', 'Ảnh chỉ hiện khi có metadata xác minh đúng món · <small>Version: Deploy {deployVersion.deploy}</small></footer>')
  assert.equal(normalize(fs.readFileSync(file, 'utf8')), expected, `${file} differs from rollback target`)
}
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
try {
  await page.goto('http://127.0.0.1:5173/')
  assert.ok((await page.locator('footer').textContent()).includes(`Version: Deploy ${version.deploy}`))
  assert.equal(await page.locator('.site-header nav button').count(), 6)
  await page.getByRole('button', { name: 'Chọn cho tôi' }).click()
  assert.equal(await page.locator('.result-section .dish-card').count(), 1)
  await page.getByRole('button', { name: 'Món ăn', exact: true }).click()
  assert.ok(await page.locator('.page .dish-card').count() > 1)
  await page.getByRole('button', { name: '7 ngày', exact: true }).click()
  await page.getByRole('button', { name: 'Tạo thực đơn' }).click()
  assert.equal(await page.locator('.day-card').count(), 7)
  await page.getByRole('button', { name: 'Đi chợ', exact: true }).click()
  assert.ok(await page.locator('.shopping-list input').count() > 0)
  await page.locator('.shopping-list input').first().check()
  await page.reload(); await page.getByRole('button', { name: 'Đi chợ', exact: true }).click()
  assert.ok(await page.locator('.shopping-list input').first().isChecked())
  await page.getByRole('button', { name: 'Hôm nay', exact: true }).click()
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  }
  assert.deepEqual(errors, [])
  const report = { deploy: version.deploy, rollbackTarget: target, sourceFilesMatch: files, onlyAppDifference: 'version import/footer', tested: ['home suggestion', 'catalog', 'weekly planner', 'shopping checklist persists', 'desktop/tablet/mobile'], consoleErrors: errors }
  fs.writeFileSync(`reports/deploy-${version.deploy}-rollback-check.json`, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally { await browser.close() }
