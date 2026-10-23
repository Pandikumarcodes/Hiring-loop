import {
  test,
  expect,
  apiOrigin,
  email,
  headers,
  inbox,
  lifecycleAdminEmail,
  login,
  mutate,
  organization,
  orgName,
  register,
} from './support.ts'

test('browser hiring lifecycle: registration through hired outcome and talent pool membership', async ({
  page,
}) => {
  test.setTimeout(360_000)
  page.on('pageerror', (error) =>
    console.error('[hiring-lifecycle browser error]', error.message),
  )
  const admin = lifecycleAdminEmail,
    candidate = email('candidate')
  let org: { id: string; slug: string },
    jobId: string,
    applicationId: string,
    candidateId: string,
    interviewId: string
  const title = 'Synthetic Platform Engineer'
  await test.step('register, verify through fake mailbox, login and create organization', async () => {
    await register(page, admin, true)
    await login(page, admin)
    org = await organization(page, 'Lifecycle')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
  await test.step('create draft, edit and publish job, verify public career page', async () => {
    await page.goto(`/app/organizations/${org.id}/jobs/new`)
    await page.getByLabel('Number of openings').fill('0')
    await page.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(
      page.getByText('Enter a whole number from 1 to 1,000.'),
    ).toBeVisible()
    await page.getByLabel('Number of openings').fill('1')
    await page.getByLabel(/^Job title/).fill(title)
    const saveDraft = page.getByRole('button', {
      name: 'Save draft',
      exact: true,
    })
    await expect(saveDraft).toBeEnabled()
    await saveDraft.click()
    await expect(page).toHaveURL(/\/jobs\/[a-f0-9-]+$/)
    jobId = page.url().split('/').at(-1)!
    await page.goto(`/app/organizations/${org.id}/jobs/${jobId}/edit`)
    await page
      .getByLabel('Description', { exact: true })
      .fill('Synthetic browser verification role.')
    await page.getByLabel('Employment type').selectOption('FULL_TIME')
    await page.getByLabel('Workplace type').selectOption('REMOTE')
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(
      page.getByText('Synthetic browser verification role.'),
    ).toBeVisible()
    await page
      .getByRole('button', { name: `Actions for ${title}`, exact: true })
      .click()
    await page.getByRole('menuitem', { name: 'Open', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Open', exact: true })
      .click()
    await expect(
      page.getByRole('link', { name: 'View public posting' }),
    ).toBeVisible()
    await page.goto(`/careers/${org.slug}`)
    await page.getByRole('link').filter({ hasText: title }).first().click()
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible()
  })
  await test.step('submit public application with an actual browser file PUT and replay safely', async () => {
    await page.goto(`/careers/${org.slug}/jobs/${jobId}/apply`)
    await page.getByLabel('First name').fill('Synthetic')
    await page.getByLabel('Last name').fill('Candidate')
    await page.getByLabel(/^Email/).fill(candidate)
    await page.getByLabel(/^Resume/).setInputFiles({
      name: 'synthetic-resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\nSynthetic resume only.\n%%EOF'),
    })
    const upload = page.waitForResponse(
      (r) =>
        r.url().startsWith('http://127.0.0.1:4701/objects/') &&
        r.request().method() === 'PUT',
    )
    const completed = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/jobs/${jobId}/applications`) &&
        r.request().method() === 'POST',
    )
    await page
      .getByRole('button', { name: 'Submit application', exact: true })
      .click()
    expect((await upload).status()).toBe(200)
    const response = await completed
    expect(response.status()).toBe(201)
    await expect(
      page.getByRole('heading', {
        name: /application.*submitted|application received|thank you/i,
      }),
    ).toBeVisible()
    const replay = await page.request.post(response.url(), {
      data: response.request().postDataJSON(),
      headers: {
        'Idempotency-Key': response.request().headers()['idempotency-key']!,
        Origin: 'http://127.0.0.1:4173',
      },
    })
    expect(replay.status()).toBe(201)
    expect(await replay.json()).toEqual(await response.json())
  })
  await test.step('review candidate and persisted resume/application in the recruiter UI', async () => {
    await page.goto(`/app/organizations/${org.id}/candidates`)
    await page
      .getByRole('link', { name: 'Synthetic Candidate', exact: true })
      .click()
    candidateId = page.url().split('/').at(-1)!
    await page
      .getByRole('link', { name: 'View application', exact: true })
      .click()
    applicationId = page.url().split('/').at(-1)!
    await expect(page.getByText('synthetic-resume.pdf')).toBeVisible()
    await page.reload()
    await expect(page.getByText('synthetic-resume.pdf')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Hire', exact: true }),
    ).toBeDisabled()
  })
  await test.step('configure and publish scorecard through the UI', async () => {
    await page.goto(`/app/organizations/${org.id}/jobs/${jobId}/scorecard`)
    await page
      .getByRole('button', { name: 'Create Scorecard', exact: true })
      .click()
    await page
      .getByRole('textbox', { name: 'Title' })
      .fill('Synthetic technical evaluation')
    if ((await page.getByLabel('Label', { exact: true }).count()) === 0)
      await page.getByRole('button', { name: 'Add criterion' }).click()
    await page
      .getByLabel('Label', { exact: true })
      .first()
      .fill('Technical skill')
    const saved = page.waitForResponse(
      (r) => r.request().method() === 'PUT' || r.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
    expect((await saved).ok()).toBeTruthy()
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Publish', exact: true })
      .click()
    await expect(page.getByText('Published v1')).toBeVisible()
  })
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  await test.step('schedule eligible interviewer, reject overlap, edit and reschedule', async () => {
    await page.goto(
      `/app/organizations/${org.id}/applications/${applicationId}`,
    )
    await page
      .getByRole('button', { name: 'Schedule interview', exact: true })
      .click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Interview title').fill('Synthetic interview')
    await dialog.getByLabel(/^Date/).fill(date)
    await dialog.getByLabel('Start time').fill('10:00')
    await dialog.getByRole('checkbox', { name: new RegExp(admin) }).check()
    await dialog
      .getByRole('button', { name: 'Schedule interview', exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await page
      .getByRole('button', { name: 'Schedule interview', exact: true })
      .click()
    await dialog.getByLabel('Interview title').fill('Conflicting interview')
    await dialog.getByLabel(/^Date/).fill(date)
    await dialog.getByLabel('Start time').fill('10:00')
    await dialog.getByRole('checkbox', { name: new RegExp(admin) }).check()
    await dialog
      .getByRole('button', { name: 'Schedule interview', exact: true })
      .click()
    await expect(dialog.getByRole('alert')).toContainText(/overlap|conflict/i)
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page
      .getByRole('link')
      .filter({ hasText: 'Synthetic interview' })
      .first()
      .click()
    interviewId = page.url().split('/').at(-1)!
    await page
      .getByRole('button', { name: 'Edit interview', exact: true })
      .click()
    await dialog
      .getByLabel('Interview title')
      .fill('Synthetic interview edited')
    await dialog
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await page.getByRole('button', { name: 'Reschedule', exact: true }).click()
    await dialog.getByLabel('Start time').fill('11:00')
    await dialog
      .getByRole('button', { name: 'Reschedule interview', exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await page.goto(`/app/organizations/${org.id}/interviews?start=${date}`)
    await expect(
      page.getByRole('link').filter({ hasText: 'Synthetic interview edited' }),
    ).toBeVisible()
  })
  await test.step('assigned evaluator saves draft, submits scorecard and sees feedback', async () => {
    await page.goto(
      `/app/organizations/${org.id}/interviews/${interviewId}/scorecard`,
    )
    await page
      .getByRole('button', { name: 'Submit Scorecard', exact: true })
      .click()
    await expect(page.getByRole('alert')).toContainText(
      'Answer all required criteria',
    )
    await page
      .getByRole('group', { name: 'Technical skill' })
      .getByRole('radio', { name: '4', exact: true })
      .check()
    await page.getByRole('radio', { name: 'YES', exact: true }).check()
    await page
      .getByLabel('Overall Comments')
      .fill('Synthetic strong interview evidence.')
    const saved = page.waitForResponse(
      (r) => /scorecard/.test(r.url()) && r.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
    expect((await saved).ok()).toBeTruthy()
    await page.reload()
    await expect(page.getByLabel('Overall Comments')).toHaveValue(
      'Synthetic strong interview evidence.',
    )
    await page
      .getByRole('button', { name: 'Submit Scorecard', exact: true })
      .click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Submit Scorecard', exact: true })
      .click()
    await expect(page.getByText('Submitted', { exact: true })).toBeVisible()
    await page.goto(`/app/organizations/${org.id}/interviews/${interviewId}`)
    await expect(
      page.getByRole('heading', { name: 'Synthetic interview edited' }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'View Scorecard', exact: true })
      .click()
    await expect(
      page.getByText('Synthetic strong interview evidence.'),
    ).toBeVisible()
  })
  await test.step('create communication template, send and verify fake provider/history', async () => {
    await page.goto(
      `/app/organizations/${org.id}/applications/${applicationId}`,
    )
    await page.getByRole('button', { name: 'Manage templates' }).click()
    await page
      .getByRole('button', { name: /New template|Create template/ })
      .click()
    const dialog = page.getByRole('dialog').last()
    await dialog.getByLabel(/^Name/).fill('Synthetic update')
    await dialog.getByLabel(/^Subject/).fill('Synthetic interview update')
    await dialog
      .getByLabel(/^Message/)
      .fill('Thank you for the synthetic interview.')
    await dialog
      .getByRole('button', { name: /Save template|Create template/ })
      .click()
    await page
      .getByRole('dialog', { name: 'Communication templates' })
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await page.getByRole('button', { name: 'Send Email', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByLabel('Use template')
      .selectOption({ label: 'Synthetic update' })
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Send email', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Synthetic interview update' }),
    ).toBeVisible()
    expect(
      (await inbox(page.request, candidate)).some(
        (m) => m.subject === 'Synthetic interview update',
      ),
    ).toBe(true)
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Synthetic interview update' }),
    ).toBeVisible()
  })
  await test.step('draft/edit/send offer, revise/send, record accepted and hire', async () => {
    await page
      .getByRole('button', { name: 'Create offer', exact: true })
      .click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel(/^Job title/).fill(title)
    await dialog.getByLabel('Base compensation (minor units)').fill('12500000')
    await dialog
      .getByRole('button', { name: /Save offer|Create offer/, exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await page.getByRole('button', { name: 'Edit draft', exact: true }).click()
    await dialog
      .getByLabel('Additional terms')
      .fill('Synthetic terms version one.')
    await dialog
      .getByRole('button', { name: /Save offer|Save changes/, exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await page.getByRole('button', { name: 'Send offer', exact: true }).click()
    await dialog
      .getByRole('button', { name: 'Send offer', exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await page
      .getByRole('button', { name: 'New revision', exact: true })
      .click()
    await dialog.getByLabel('Base compensation (minor units)').fill('13000000')
    await dialog
      .getByRole('button', { name: /Create revision|Save offer/, exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await page
      .getByRole('button', { name: 'Send revised offer', exact: true })
      .click()
    await dialog
      .getByRole('button', { name: 'Send offer', exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await page
      .getByRole('button', { name: 'Record accepted', exact: true })
      .click()
    await dialog
      .getByRole('button', { name: 'Record accept', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Hire', exact: true }),
    ).toBeEnabled()
    await page.getByRole('button', { name: 'Hire', exact: true }).click()
    await dialog
      .getByRole('button', { name: 'Mark hired', exact: true })
      .click()
    await expect(page.getByText('HIRED', { exact: true })).toBeVisible()
    await expect(page.getByText('hired', { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText('HIRED', { exact: true })).toBeVisible()
    expect(
      (await inbox(page.request, candidate)).filter((m) => m.to === candidate)
        .length,
    ).toBeGreaterThanOrEqual(3)
  })
  await test.step('create pool, add eligible candidate, verify and remove membership', async () => {
    await page.goto(`/app/organizations/${org.id}/talent-pools`)
    await page.getByRole('button', { name: 'Create talent pool' }).click()
    await page
      .getByRole('dialog')
      .getByLabel(/^Name/)
      .fill('Synthetic future opportunities')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Save pool' })
      .click()
    await expect(
      page.getByRole('link', {
        name: 'Synthetic future opportunities',
        exact: true,
      }),
    ).toBeVisible()
    await page.goto(`/app/organizations/${org.id}/candidates/${candidateId}`)
    await page.getByRole('button', { name: 'Add to pool', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByLabel('Talent pool', { exact: true })
      .selectOption({ label: 'Synthetic future opportunities' })
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Add candidate', exact: true })
      .click()
    await page
      .getByRole('link', {
        name: 'Synthetic future opportunities',
        exact: true,
      })
      .click()
    await expect(
      page.getByRole('link', { name: 'Synthetic Candidate', exact: true }),
    ).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: 'Remove', exact: true }).click()
    await expect(page.getByText('No members', { exact: true })).toBeVisible()
  })
})

test('authentication failures, protected routes, logout and actual session expiration', async ({
  page,
}) => {
  const address = email('auth')
  await page.goto('/app/organizations/new')
  await expect(page).toHaveURL(/\/login$/)
  expect(
    (await page.request.get(`${apiOrigin}/api/v1/organizations`)).status(),
  ).toBe(401)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('Enter your password.')).toBeVisible()
  await register(page, address)
  await page.goto('/login')
  await page.getByLabel(/^Email/).fill(address)
  await page.getByLabel(/^Password/).fill('Definitely-wrong-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('incorrect')
  await login(page, address)
  await page.getByRole('button', { name: /^Open account menu/ }).click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/app')
  await expect(page).toHaveURL(/\/login$/)
  await login(page, address)
  expect(
    (
      await page.request.post(`${apiOrigin}/api/v1/__e2e/expire-session`, {
        headers,
        data: { email: address },
      })
    ).status(),
  ).toBe(204)
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
  expect((await page.request.get(`${apiOrigin}/api/v1/auth/me`)).status()).toBe(
    401,
  )
})

test('organization switching, invited member restrictions and cross-tenant denial', async ({
  page,
  browser,
}) => {
  const admin = email('owner'),
    member = email('interviewer'),
    primaryName = orgName('Roles'),
    foreignName = orgName('Private')
  await register(page, admin)
  await login(page, admin)
  const primary = await organization(page, 'Roles'),
    foreign = await organization(page, 'Private')
  await page
    .getByRole('button', { name: `Switch workspace: ${foreignName}` })
    .click()
  await expect(page.getByRole('menu', { name: 'Workspaces' })).toBeVisible()
  await page.getByRole('menuitem', { name: primaryName, exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/app/organizations/${primary.id}$`))
  await expect(
    page.getByRole('button', { name: `Switch workspace: ${primaryName}` }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Jobs', exact: true }),
  ).toHaveAttribute('href', `/app/organizations/${primary.id}/jobs`)
  await page.goto(`/app/organizations/${primary.id}/team`)
  await page.getByRole('button', { name: 'Invite member', exact: true }).click()
  await page.getByLabel(/^Email/).fill(member)
  await page.getByLabel('Role', { exact: true }).selectOption('INTERVIEWER')
  await page
    .getByRole('button', { name: 'Send invitation', exact: true })
    .click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Invitation saved' }),
  ).toBeVisible()
  const messages = await inbox(page.request, member)
  const token = messages.find((m) => m.invitationToken || m.token)
  expect(token).toBeTruthy()
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' })
  try {
    const interviewer = await context.newPage()
    await register(interviewer, member)
    await login(interviewer, member)
    await interviewer.goto(
      `/invitations/accept?token=${token!.invitationToken ?? token!.token}`,
    )
    await expect(interviewer).toHaveURL(
      new RegExp(`/app/organizations/${primary.id}$`),
    )
    await interviewer.goto(`/app/organizations/${primary.id}/jobs/new`)
    await expect(
      interviewer.getByText(
        'You do not have permission to create jobs in this workspace.',
      ),
    ).toBeVisible()
    expect(
      (
        await mutate(interviewer, `/organizations/${primary.id}/jobs`, {
          title: 'Forbidden job',
        })
      ).status(),
    ).toBe(403)
    const denied = interviewer.waitForResponse(
      (r) => r.url() === `${apiOrigin}/api/v1/organizations/${foreign.id}`,
    )
    await interviewer.goto(`/app/organizations/${foreign.id}`)
    expect((await denied).status()).toBe(404)
    await expect(
      interviewer.getByText(/unavailable|not found/i).first(),
    ).toBeVisible()
  } finally {
    await context.close()
  }
})

test('real stale revision conflict and visible recoverable API failure', async ({
  page,
}) => {
  const address = email('conflict')
  await register(page, address)
  await login(page, address)
  const org = await organization(page, 'Conflicts')
  await page.goto(`/app/organizations/${org.id}/jobs/new`)
  await page.getByLabel(/^Job title/).fill('Stale revision role')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page).toHaveURL(/\/jobs\/[a-f0-9-]+$/)
  const detail = page.url(),
    edit = `${detail}/edit`
  await page.goto(edit)
  const other = await page.context().newPage()
  try {
    await other.goto(edit)
    await expect(other.getByLabel(/^Job title/)).toHaveValue(
      'Stale revision role',
    )
    await other.getByLabel(/^Job title/).fill('Updated in another tab')
    await other
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(other).toHaveURL(detail)
    await page.getByLabel(/^Job title/).fill('Stale tab overwrite')
    const conflict = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && r.url().includes('/jobs/'),
    )
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    expect((await conflict).status()).toBe(409)
    await expect(page.getByRole('alert')).toContainText(
      /changed|updated|another/i,
    )
    await page.getByRole('button', { name: 'Reload job', exact: true }).click()
    await expect(page.getByLabel(/^Job title/)).toHaveValue(
      'Updated in another tab',
    )
  } finally {
    await other.close()
  }
  const pattern = `**/api/v1/organizations/${org.id}/jobs?*`
  await page.route(pattern, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Synthetic temporary failure',
          requestId: 'e2e-fault',
        },
      }),
    }),
  )
  await page.goto(`/app/organizations/${org.id}/jobs`)
  await expect(
    page.getByRole('alert').filter({ hasText: 'We could not load jobs.' }),
  ).toBeVisible()
  await page.unroute(pattern)
  await page.getByRole('button', { name: /try again|retry/i }).click()
  await expect(
    page.getByRole('link', { name: 'Updated in another tab', exact: true }),
  ).toBeVisible()
})
