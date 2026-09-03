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
      className="organization-onboarding"
      aria-labelledby="organization-onboarding-title"
    >
      <div className="organization-onboarding__content">
        <p className="eyebrow">Get started</p>
        <h1 id="organization-onboarding-title">
          {organizationCount
            ? 'Create a new organization'
            : 'Create your first organization'}
        </h1>
        <p className="organization-onboarding__intro">
          Set up the workspace where your hiring team will stay aligned.
        </p>
        {createOrganization.isError ? (
          <AuthAlert>
            {organizationMutationError(createOrganization.error)} Please try
            again.
          </AuthAlert>
        ) : null}
        <form className="organization-form" onSubmit={submit} noValidate>
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
            className="organization-form__submit"
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
        className="organization-onboarding__guidance"
        aria-labelledby="organization-guidance-title"
      >
        <p className="organization-onboarding__guidance-mark">HL</p>
        <h2 id="organization-guidance-title">A focused home for hiring</h2>
        <p>
          You will be the first member and organization admin. You can invite
          your team when that experience is ready.
        </p>
        <ul>
          <li>Keep hiring work in one shared workspace</li>
          <li>Give your team a clear source of truth</li>
        </ul>
      </aside>
    </section>
  )
}
