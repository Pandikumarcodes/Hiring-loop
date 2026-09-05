import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { AuthAlert } from '../../auth/components'
import { Button, Field, Input, Textarea } from '../../../shared/components/ui'
import { useCreateOrganization } from '../hooks/mutations'
import { organizationMutationError } from '../utils/organization-utils'

interface FormErrors {
  name?: string
  website?: string
}

export function OrganizationOnboardingPage({
  organizationCount = 0,
}: {
  organizationCount?: number
}) {
  const navigate = useNavigate()
  const createOrganization = useCreateOrganization()
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  function validate(): FormErrors {
    const next: FormErrors = {}
    if (!name.trim()) next.name = 'Enter your organization name.'
    if (website.trim()) {
      try {
        new URL(website.trim())
      } catch {
        next.website = 'Enter a valid website URL, including https://.'
      }
    }
    return next
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (createOrganization.isPending) return
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    createOrganization.reset()
    try {
      const organization = await createOrganization.mutateAsync({
        name: name.trim(),
        ...(website.trim() ? { website: website.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      })
      navigate(`/app/organizations/${organization.id}`, { replace: true })
    } catch {
      // Form values stay in local state so recoverable failures are retryable.
    }
  }

  return (
    <section
      className="mx-auto grid w-full max-w-7xl min-w-0 gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] lg:gap-16 lg:px-12 lg:py-14"
      aria-labelledby="organization-onboarding-title"
    >
      <div className="min-w-0 max-w-2xl">
        <p className="eyebrow">Get started</p>
        <h1 id="organization-onboarding-title">
          {organizationCount
            ? 'Create a new organization'
            : 'Create your first organization'}
        </h1>
        <p className="mt-3 mb-8 max-w-2xl text-lg leading-7 text-text-secondary">
          Set up the workspace where your hiring team will stay aligned.
        </p>
        {createOrganization.isError ? (
          <AuthAlert>
            {organizationMutationError(createOrganization.error)} Please try
            again.
          </AuthAlert>
        ) : null}
        <form className="grid min-w-0 gap-6" onSubmit={submit} noValidate>
          <Field
            error={errors.name}
            helperText="This is the name your team will see in HiringLoop."
            id="organization-name"
            label="Organization name"
            required
          >
            {({ describedBy, invalid }) => (
              <Input
                aria-describedby={describedBy}
                aria-invalid={invalid}
                autoComplete="organization"
                disabled={createOrganization.isPending}
                id="organization-name"
                name="name"
                onChange={(event) => {
                  setName(event.target.value)
                  if (errors.name)
                    setErrors((current) => ({ ...current, name: undefined }))
                }}
                value={name}
              />
            )}
          </Field>
          <Field
            error={errors.website}
            helperText="Optional. Include the full URL, such as https://example.com."
            id="organization-website"
            label="Website"
          >
            {({ describedBy, invalid }) => (
              <Input
                aria-describedby={describedBy}
                aria-invalid={invalid}
                autoComplete="url"
                disabled={createOrganization.isPending}
                id="organization-website"
                name="website"
                onChange={(event) => {
                  setWebsite(event.target.value)
                  if (errors.website)
                    setErrors((current) => ({ ...current, website: undefined }))
                }}
                placeholder="https://example.com"
                type="url"
                value={website}
              />
            )}
          </Field>
          <Field
            helperText="Optional. Add a short description to help your team recognize this workspace."
            id="organization-description"
            label="Description"
          >
            {({ describedBy }) => (
              <Textarea
                aria-describedby={describedBy}
                disabled={createOrganization.isPending}
                id="organization-description"
                name="description"
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            )}
          </Field>
          <Button
            className="w-full sm:w-auto"
            loading={createOrganization.isPending}
            type="submit"
          >
            {createOrganization.isPending
              ? 'Creating organization…'
              : 'Create organization'}
          </Button>
        </form>
      </div>
      <aside
        className="self-start rounded-card border border-teal-200 bg-primary-soft p-5 shadow-sm sm:p-8"
        aria-labelledby="organization-guidance-title"
      >
        <p className="mb-8 font-extrabold tracking-[0.12em] text-primary-dark">
          HL
        </p>
        <h2 className="text-xl font-bold" id="organization-guidance-title">
          A focused home for hiring
        </h2>
        <p className="mt-3 leading-6 text-text-secondary">
          You will be the first member and organization admin. You can invite
          your team when that experience is ready.
        </p>
        <ul className="mt-6 grid gap-3 pl-5 leading-6 text-text-primary">
          <li>Keep hiring work in one shared workspace</li>
          <li>Give your team a clear source of truth</li>
        </ul>
      </aside>
    </section>
  )
}
