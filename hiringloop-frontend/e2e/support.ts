import { randomUUID } from 'node:crypto'
import {
  test as base,
  expect,
  type Page,
  type APIRequestContext,
} from '@playwright/test'

export const apiOrigin = 'http://127.0.0.1:4700'
export const runId = process.env.E2E_RUN_ID!
export const password = 'Synthetic-E2E-Password-2026!'
export const email = (label: string) =>
  `${label}-${randomUUID().slice(0, 8)}@${runId}.e2e.test`
export const orgName = (label: string) => `E2E ${runId} ${label}`
export const headers = { 'X-E2E-Control': process.env.E2E_CONTROL_TOKEN! }
export const test = base.extend({
  page: async ({ page, request }, provide) => {
    const readiness = await request.get(`${apiOrigin}/api/v1/__e2e/ready`, {
      headers,
    })
    expect(await readiness.json()).toEqual({
      database: 'hiringloop_test',
      runId,
      fakeProviders: true,
    })
    // Provider calls must remain local. This also catches accidental CDN/API use.
    await page.context().route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname))
        return route.abort('blockedbyclient')
      await route.continue()
    })
    await provide(page)
  },
})
export { expect }
export async function inbox(request: APIRequestContext, address: string) {
  const response = await request.get(
    `${apiOrigin}/api/v1/__e2e/inbox?email=${encodeURIComponent(address)}`,
    { headers },
  )
  expect(response.ok()).toBeTruthy()
  return response.json() as Promise<
    Array<{
      verificationToken?: string
      token?: string
      invitationToken?: string
      subject?: string
      to?: string
    }>
  >
}
export async function register(page: Page, address: string, browser = false) {
  if (browser) {
    await page.goto('/register')
    await page.getByLabel('Work email').fill(address)
    await page.getByLabel(/^Password/).fill(password)
    await page
      .getByRole('button', { name: 'Create account', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Check your inbox' }),
    ).toBeVisible()
  } else {
    const response = await page.request.post(
      `${apiOrigin}/api/v1/auth/register`,
      { data: { email: address, password } },
    )
    expect(response.status()).toBe(202)
  }
  const messages = await inbox(page.request, address)
  const token = messages.find((m) => m.verificationToken)?.verificationToken
  expect(token).toBeTruthy()
  await page.goto(`/verify-email?token=${token}`)
  await page.getByRole('button', { name: 'Verify email', exact: true }).click()
  await expect(
    page
      .getByText(/email verified|email is verified|verified successfully/i)
      .first(),
  ).toBeVisible()
}
export async function login(page: Page, address: string) {
  await page.goto('/login')
  await page.getByLabel(/^Email/).fill(address)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/app/)
}
export async function organization(page: Page, label: string) {
  await page.goto('/app/organizations/new')
  await page.getByLabel('Organization name').fill(orgName(label))
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/v1/organizations') &&
      r.request().method() === 'POST',
  )
  await page
    .getByRole('button', { name: 'Create organization', exact: true })
    .click()
  const result = await response
  expect(result.status()).toBe(201)
  await expect(page).toHaveURL(/\/app\/organizations\/[a-f0-9-]+$/)
  return (await result.json()).data.organization as { id: string; slug: string }
}
export async function csrf(page: Page) {
  const response = await page.request.get(`${apiOrigin}/api/v1/auth/csrf`)
  expect(response.ok()).toBeTruthy()
  const json = await response.json()
  return json.data.csrfToken as string
}
export async function mutate(
  page: Page,
  path: string,
  data: unknown,
  method = 'POST',
) {
  return page.request.fetch(`${apiOrigin}/api/v1${path}`, {
    method,
    headers: {
      Origin: 'http://127.0.0.1:4173',
      'X-CSRF-Token': await csrf(page),
    },
    data,
  })
}
