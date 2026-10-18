export default async function teardown() {
  const response = await fetch('http://127.0.0.1:4700/api/v1/__e2e/cleanup', {
    method: 'POST',
    headers: { 'X-E2E-Control': process.env.E2E_CONTROL_TOKEN! },
  })
  if (!response.ok)
    throw new Error(`E2E fixture cleanup failed: HTTP ${response.status}`)
  console.log('E2E scoped cleanup:', await response.json())
}
