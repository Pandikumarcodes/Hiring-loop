import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../../shared/components/feedback'
import { Alert } from '../../../shared/components/ui/Alert'
import { Button, Card, Field, Input } from '../../../shared/components/ui'
import { isApiError } from '../../../shared/lib/apiErrors'
import { usePublicCareerJob } from '../../public-careers/hooks/queries'
import { ApplicationQuestionField } from '../components/ApplicationQuestionField'
import {
  useAuthorizePublicApplicationUpload,
  useSubmitPublicApplication,
} from '../hooks/mutations'
import { usePublicApplicationForm } from '../hooks/queries'
import { putResumeToSignedUrl } from '../utils/direct-upload'
import {
  allowedResumeTypes,
  answerForSubmission,
  applicationErrorMessage,
  candidateApplicationSchema,
  type CandidateApplicationFormValues,
  newIdempotencyKey,
  readableFileSize,
} from '../utils/application-utils'

type UploadStatus = 'idle' | 'ready' | 'uploading' | 'uploaded' | 'error'

export function PublicApplyPage() {
  const { organizationSlug = '', jobId = '' } = useParams()
  const jobQuery = usePublicCareerJob(organizationSlug, jobId)
  const formQuery = usePublicApplicationForm(organizationSlug, jobId)
  const authorizeUpload = useAuthorizePublicApplicationUpload(
    organizationSlug,
    jobId,
  )
  const submitApplication = useSubmitPublicApplication(organizationSlug, jobId)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const successHeadingRef = useRef<HTMLHeadingElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const idempotencyKeyRef = useRef<string | null>(null)
  const resumeUploadIdRef = useRef<string | null>(null)

  const data = formQuery.data
  const questions = data?.questions ?? []
  const schema = useMemo(
    () => candidateApplicationSchema(data?.questions ?? []),
    [data?.questions],
  )
  const {
    control,
    formState: { errors },
    handleSubmit,
    setValue,
  } = useForm<CandidateApplicationFormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      answers: {},
      resume: null,
    },
    resolver: zodResolver(schema, undefined, { mode: 'sync' }),
    mode: 'onSubmit',
  })
  const resume = useWatch({ control, name: 'resume' })

  useEffect(() => {
    if (submitted) successHeadingRef.current?.focus()
  }, [submitted])

  function formChanged() {
    if (!isSubmitting) idempotencyKeyRef.current = null
  }

  function selectResume(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    formChanged()
    resumeUploadIdRef.current = null
    setValue('resume', file, { shouldValidate: true, shouldDirty: true })
    setUploadStatus(file ? 'ready' : 'idle')
    setNotice('')
  }

  function removeResume() {
    if (isSubmitting) return
    idempotencyKeyRef.current = null
    resumeUploadIdRef.current = null
    setValue('resume', null, { shouldValidate: true, shouldDirty: true })
    setUploadStatus('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function submit(values: CandidateApplicationFormValues) {
    if (isSubmitting || !data) return
    setNotice('')
    const selectedResume = values.resume
    if (!selectedResume) return

    const idempotencyKey = idempotencyKeyRef.current ?? newIdempotencyKey()
    idempotencyKeyRef.current = idempotencyKey
    setIsSubmitting(true)
    let uploadId = resumeUploadIdRef.current
    let stage: 'upload' | 'submission' = uploadId ? 'submission' : 'upload'
    try {
      if (!uploadId) {
        setUploadStatus('uploading')
        const authorization = await authorizeUpload.mutateAsync({
          filename: selectedResume.name,
          mimeType: selectedResume.type || resumeMimeType(selectedResume.name),
          sizeBytes: selectedResume.size,
        })
        const {
          signedUploadUrl,
          requiredHeaders,
          uploadId: authorizedUploadId,
        } = authorization
        authorizeUpload.reset?.()
        await putResumeToSignedUrl(
          signedUploadUrl,
          selectedResume,
          requiredHeaders,
        )
        uploadId = authorizedUploadId
        resumeUploadIdRef.current = uploadId
        setUploadStatus('uploaded')
      } else {
        setUploadStatus('uploaded')
      }
      stage = 'submission'
      await submitApplication.mutateAsync({
        candidate: {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
        },
        formVersionId: data.versionId,
        answers: answerForSubmission(questions, values.answers),
        resumeUploadId: uploadId,
        idempotencyKey,
      })
      idempotencyKeyRef.current = null
      resumeUploadIdRef.current = null
      setSubmitted(true)
    } catch (error) {
      if (stage === 'upload') {
        resumeUploadIdRef.current = null
        setUploadStatus('error')
      } else setUploadStatus('uploaded')
      setNotice(
        stage === 'upload'
          ? uploadErrorMessage(error)
          : applicationErrorMessage(error),
      )
      if (shouldDiscardIdempotencyKey(error, stage))
        idempotencyKeyRef.current = null
    } finally {
      authorizeUpload.reset?.()
      submitApplication.reset?.()
      setIsSubmitting(false)
    }
  }

  if (jobQuery.isPending || formQuery.isPending)
    return (
      <ApplyWrap>
        <LoadingState label="Loading application" />
      </ApplyWrap>
    )
  if (jobQuery.isError || !jobQuery.data)
    return (
      <ApplyWrap>
        <ErrorState
          title={
            isApiError(jobQuery.error) && jobQuery.error.status === 404
              ? 'This job is no longer available.'
              : "We couldn't load this job."
          }
          description={
            isApiError(jobQuery.error) && jobQuery.error.status === 404
              ? 'The job may have closed or is not available right now.'
              : 'Please try again or return to the careers page.'
          }
          onRetry={
            isApiError(jobQuery.error) && jobQuery.error.status === 404
              ? undefined
              : () => void jobQuery.refetch()
          }
          action={
            <Link
              className="font-semibold text-primary-dark underline"
              to={`/careers/${encodeURIComponent(organizationSlug)}`}
            >
              All open positions
            </Link>
          }
        />
      </ApplyWrap>
    )
  if (formQuery.isError || !data)
    return (
      <ApplyWrap>
        <ErrorState
          title="Application unavailable"
          description="This application form is currently unavailable. Please try again later."
          onRetry={() => void formQuery.refetch()}
          action={
            <Link
              className="font-semibold text-primary-dark underline"
              to={`/careers/${encodeURIComponent(organizationSlug)}/jobs/${encodeURIComponent(jobId)}`}
            >
              Back to job
            </Link>
          }
        />
      </ApplyWrap>
    )
  const job = jobQuery.data.job
  const organization = jobQuery.data.organization
  if (submitted)
    return (
      <ApplyWrap>
        <section
          className="grid justify-items-start gap-5 rounded-card border border-emerald-200 bg-surface p-6 shadow-sm sm:p-8"
          aria-labelledby="application-success-heading"
        >
          <span
            className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl font-extrabold text-success"
            aria-hidden="true"
          >
            ✓
          </span>
          <h1
            ref={successHeadingRef}
            id="application-success-heading"
            tabIndex={-1}
            className="text-3xl font-bold tracking-tight"
          >
            Application submitted
          </h1>
          <p className="max-w-2xl leading-7 text-text-secondary">
            Thanks for applying to {job.title}. Your application has been
            received.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2"
              to={`/careers/${encodeURIComponent(organizationSlug)}/jobs/${encodeURIComponent(jobId)}`}
            >
              Back to job
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-border bg-surface px-4 py-2.5 text-sm font-bold text-text-primary hover:bg-background focus-visible:outline-3 focus-visible:outline-primary-dark focus-visible:outline-offset-2"
              to={`/careers/${encodeURIComponent(organizationSlug)}`}
            >
              View careers
            </Link>
          </div>
        </section>
      </ApplyWrap>
    )

  const busy =
    isSubmitting || authorizeUpload.isPending || submitApplication.isPending
  return (
    <ApplyWrap>
      <header className="mb-8">
        <Link
          className="font-semibold text-primary-dark underline"
          to={`/careers/${encodeURIComponent(organizationSlug)}/jobs/${encodeURIComponent(jobId)}`}
        >
          Back to job
        </Link>
        <p className="mt-7 text-sm font-bold uppercase tracking-wider text-primary-dark">
          {organization?.name}
        </p>
        <h1 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">
          Apply for {job.title}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-text-secondary">
          Share a few details and your resume to apply for this opportunity.
        </p>
      </header>
      {notice ? (
        <Alert
          className="mb-6 border-amber-200 bg-amber-50 text-amber-900"
          tabIndex={-1}
        >
          {notice}
        </Alert>
      ) : null}
      <div
        ref={errorSummaryRef}
        tabIndex={-1}
        aria-live="polite"
        className={
          Object.keys(errors).length
            ? 'mb-6 rounded-control border border-red-200 bg-red-50 p-4 text-sm text-red-800'
            : 'sr-only'
        }
      >
        {Object.keys(errors).length
          ? `Please correct ${Object.keys(errors).length === 1 ? 'the error' : 'the errors'} below.`
          : ''}
      </div>
      <form
        className="grid min-w-0 gap-6"
        onSubmit={handleSubmit(
          (values) => void submit(values),
          () => undefined,
        )}
        noValidate
      >
        <FormSection title="Your details">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="candidate-first-name"
              label="First name"
              error={errors.firstName?.message}
              required
            >
              {(p) => (
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="candidate-first-name"
                      autoComplete="given-name"
                      maxLength={100}
                      onChange={(event) => {
                        formChanged()
                        field.onChange(event)
                      }}
                      aria-describedby={p.describedBy}
                      aria-invalid={p.invalid}
                    />
                  )}
                />
              )}
            </Field>
            <Field
              id="candidate-last-name"
              label="Last name"
              error={errors.lastName?.message}
              required
            >
              {(p) => (
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="candidate-last-name"
                      autoComplete="family-name"
                      maxLength={100}
                      onChange={(event) => {
                        formChanged()
                        field.onChange(event)
                      }}
                      aria-describedby={p.describedBy}
                      aria-invalid={p.invalid}
                    />
                  )}
                />
              )}
            </Field>
            <Field
              id="candidate-email"
              label="Email"
              error={errors.email?.message}
              required
            >
              {(p) => (
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="candidate-email"
                      type="email"
                      autoComplete="email"
                      maxLength={320}
                      onChange={(event) => {
                        formChanged()
                        field.onChange(event)
                      }}
                      aria-describedby={p.describedBy}
                      aria-invalid={p.invalid}
                    />
                  )}
                />
              )}
            </Field>
            <Field
              id="candidate-phone"
              label="Phone"
              error={errors.phone?.message}
              helperText="Optional"
            >
              {(p) => (
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="candidate-phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={50}
                      onChange={(event) => {
                        formChanged()
                        field.onChange(event)
                      }}
                      aria-describedby={p.describedBy}
                      aria-invalid={p.invalid}
                    />
                  )}
                />
              )}
            </Field>
          </div>
        </FormSection>
        <FormSection title="A few questions">
          {questions.length ? (
            <div className="grid gap-6">
              {questions.map((question) => (
                <Controller
                  key={question.id}
                  control={control}
                  name={`answers.${question.id}`}
                  render={({ field }) => (
                    <ApplicationQuestionField
                      question={question}
                      value={field.value}
                      error={errors.answers?.[question.id]?.message}
                      disabled={busy}
                      inputRef={field.ref}
                      onChange={(value) => {
                        formChanged()
                        field.onChange(value)
                      }}
                    />
                  )}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              No additional questions.
            </p>
          )}
        </FormSection>
        <FormSection title="Resume">
          <Field
            id="candidate-resume"
            label="Resume"
            required
            error={errors.resume?.message}
            helperText="PDF, DOC, or DOCX. Maximum 5 MB."
          >
            {({ describedBy, invalid }) => (
              <div className="grid gap-3">
                <Input
                  ref={fileInputRef}
                  id="candidate-resume"
                  name="resume"
                  type="file"
                  accept={`${allowedResumeTypes.join(',')},.pdf,.doc,.docx`}
                  disabled={busy}
                  onChange={selectResume}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
                {resume ? (
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-background px-3 py-2 text-sm">
                    <span className="min-w-0 break-words">
                      {resume.name}{' '}
                      <span className="text-text-secondary">
                        ({readableFileSize(resume.size)})
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={removeResume}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">
                    No resume selected.
                  </p>
                )}
                <p className="text-sm text-text-secondary" aria-live="polite">
                  {uploadStatus === 'uploading'
                    ? 'Uploading resume…'
                    : uploadStatus === 'uploaded'
                      ? 'Resume uploaded and ready for submission.'
                      : uploadStatus === 'error'
                        ? 'Resume upload failed. Try submitting again.'
                        : resume
                          ? 'Resume ready.'
                          : ''}
                </p>
              </div>
            )}
          </Field>
        </FormSection>
        <div className="flex flex-col gap-3 sm:items-end">
          <Button
            className="w-full sm:w-auto"
            type="submit"
            loading={busy}
            disabled={busy}
          >
            {isSubmitting && uploadStatus === 'uploading'
              ? 'Uploading resume…'
              : isSubmitting
                ? 'Submitting…'
                : 'Submit application'}
          </Button>
          <p className="text-xs text-text-secondary">
            By submitting, you confirm that the information provided is
            accurate.
          </p>
        </div>
      </form>
    </ApplyWrap>
  )
}

function resumeMimeType(filename: string) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.doc')) return 'application/msword'
  return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

function shouldDiscardIdempotencyKey(
  error: unknown,
  stage: 'upload' | 'submission',
) {
  if (stage === 'upload') return false
  if (!isApiError(error)) return true
  return error.kind !== 'network' && !(error.status && error.status >= 500)
}

function uploadErrorMessage(error: unknown) {
  if (
    isApiError(error) &&
    [
      'RATE_LIMITED',
      'FILE_TYPE_NOT_ALLOWED',
      'FILE_TOO_LARGE',
      'APPLICATION_STORAGE_UNAVAILABLE',
    ].includes(error.code)
  )
    return applicationErrorMessage(error)
  return 'We could not upload your resume. Your application details are still here; please try again.'
}

function FormSection({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <Card className="grid min-w-0 gap-5 p-5 sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </Card>
  )
}

function ApplyWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
      {children}
    </div>
  )
}
