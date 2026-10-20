import {
  test,
  expect,
  lifecycleAdminEmail,
  login,
  organization,
} from './support.ts'

const viewports = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
]

async function visitAndCheckWidth(
  page: import('@playwright/test').Page,
  path: string,
  width: number,
) {
  const currentPath = await page.evaluate(
    'window.location.pathname + window.location.search',
  )
  if (await page.evaluate('window.location.href === "about:blank"')) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
  } else if (currentPath !== path) {
    await page.evaluate(
      `window.history.pushState(null, '', ${JSON.stringify(path)}); window.dispatchEvent(new PopStateEvent('popstate'))`,
    )
  }
  await page.locator('#root').waitFor({ state: 'visible' })
  await page.evaluate('new Promise(resolve => requestAnimationFrame(resolve))')
  await page.waitForLoadState('networkidle', { timeout: 500 }).catch(() => {})
  const dimensions = (await page.evaluate(
    '({ documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth })',
  )) as { documentWidth: number; viewportWidth: number }
  expect(
    dimensions.documentWidth,
    `Unexpected horizontal page overflow at ${width}px on ${path}`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth)
}

test('routed UI stays usable across supported viewport sizes', async ({
  page,
}, testInfo) => {
  test.setTimeout(300_000)

  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/verify-email?token=invalid-e2e-token',
    '/reset-password?token=invalid-e2e-token',
    '/invitations/accept',
    '/careers/not-a-real-organization',
    '/careers/not-a-real-organization/jobs/00000000-0000-4000-8000-000000000000',
    '/careers/not-a-real-organization/jobs/00000000-0000-4000-8000-000000000000/apply',
    '/not-a-real-route',
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const path of publicPaths)
      await visitAndCheckWidth(page, path, viewport.width)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  // The preceding lifecycle test already verified browser registration. Reuse
  // that run-scoped test account to avoid exceeding the API's five/hour limit.
  await login(page, lifecycleAdminEmail)
  const org = await organization(page, 'Responsive verification')
  const title = 'Responsive verification role'

  await page.goto(`/app/organizations/${org.id}/jobs/new`)
  await page.getByLabel('Number of openings').fill('1')
  await page.getByLabel(/^Job title/).fill(title)
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page).toHaveURL(/\/jobs\/[a-f0-9-]+$/)
  const jobId = page.url().split('/').at(-1)!
  await page
    .getByRole('button', { name: `Actions for ${title}`, exact: true })
    .click()
  await page.getByRole('menuitem', { name: 'Open', exact: true }).click()
  const openDialog = page.getByRole('dialog')
  await expect(openDialog).toBeVisible()
  const openBounds = await openDialog.boundingBox()
  expect(openBounds).not.toBeNull()
  expect(openBounds!.x).toBeGreaterThanOrEqual(0)
  expect(openBounds!.y).toBeGreaterThanOrEqual(0)
  expect(openBounds!.x + openBounds!.width).toBeLessThanOrEqual(390)
  expect(openBounds!.y + openBounds!.height).toBeLessThanOrEqual(844)
  await openDialog.getByRole('button', { name: 'Open', exact: true }).click()

  const organizationPath = `/app/organizations/${org.id}`
  const appPaths = [
    '/app',
    '/app/organizations',
    '/app/organizations/new',
    organizationPath,
    `${organizationPath}/team`,
    `${organizationPath}/jobs`,
    `${organizationPath}/jobs/new`,
    `${organizationPath}/jobs/${jobId}`,
    `${organizationPath}/jobs/${jobId}/edit`,
    `${organizationPath}/jobs/${jobId}/pipeline`,
    `${organizationPath}/jobs/${jobId}/application-form`,
    `${organizationPath}/jobs/${jobId}/scorecard`,
    `${organizationPath}/candidates`,
    `${organizationPath}/candidates/00000000-0000-4000-8000-000000000000`,
    `${organizationPath}/applications/00000000-0000-4000-8000-000000000000`,
    `${organizationPath}/interviews`,
    `${organizationPath}/interviews/00000000-0000-4000-8000-000000000000`,
    `${organizationPath}/interviews/00000000-0000-4000-8000-000000000000/scorecard`,
    `${organizationPath}/notifications`,
    `${organizationPath}/talent-pools`,
    `${organizationPath}/talent-pools/00000000-0000-4000-8000-000000000000`,
    `${organizationPath}/analytics`,
    `${organizationPath}/audit`,
    '/app/not-a-real-route',
  ]
  const careerPaths = [
    `/careers/${org.slug}`,
    `/careers/${org.slug}/jobs/${jobId}`,
    `/careers/${org.slug}/jobs/${jobId}/apply`,
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await visitAndCheckWidth(page, organizationPath, viewport.width)
    await page.screenshot({
      path: testInfo.outputPath(`workspace-${viewport.width}.png`),
    })

    if (viewport.width < 1024) {
      const trigger = page.getByRole('button', { name: 'Open navigation' })
      await trigger.focus()
      await page.keyboard.press('Enter')
      const drawer = page.getByRole('dialog', { name: 'Workspace navigation' })
      await expect(drawer).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(drawer).not.toBeVisible()
      await expect(trigger).toBeFocused()
    } else {
      await expect(
        page.getByRole('complementary', { name: 'Workspace sidebar' }),
      ).toBeVisible()
    }

    for (const path of appPaths)
      await visitAndCheckWidth(page, path, viewport.width)
    for (const path of careerPaths)
      await visitAndCheckWidth(page, path, viewport.width)
  }

  await page.goto(`${organizationPath}/jobs/${jobId}/scorecard`)
  await page.getByRole('button', { name: 'Create Scorecard' }).click()
  await expect(
    page.getByRole('region', { name: 'Scorecard draft editor' }),
  ).toBeVisible()
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    const publish = page.getByRole('button', { name: 'Publish', exact: true })
    await publish.click()
    const dialog = page.getByRole('dialog', { name: 'Publish scorecard?' })
    await expect(dialog).toBeVisible()
    const bounds = await dialog.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.y).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width)
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height)
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(publish).toBeFocused()
  }
})
