import { useState } from 'react'
import { Button, Textarea } from '../../../shared/components/ui'
import type {
  Recommendation,
  Response,
  Scorecard,
} from '../types/scorecard.types'
const choices: readonly Recommendation[] = [
  'STRONG_NO',
  'NO',
  'MIXED',
  'YES',
  'STRONG_YES',
]
export function ScorecardForm({
  scorecard,
  onSave,
  onSubmit,
  busy,
  error,
}: {
  scorecard: Scorecard
  onSave: (v: readonly Response[], r: Recommendation | null, c: string) => void
  onSubmit: (
    v: readonly Response[],
    r: Recommendation | null,
    c: string,
  ) => void
  busy: boolean
  error?: string
}) {
  const [responses, setResponses] = useState<readonly Response[]>(
      scorecard.responses,
    ),
    [recommendation, setRecommendation] = useState<Recommendation | null>(
      scorecard.overallRecommendation,
    ),
    [comment, setComment] = useState(scorecard.overallComment ?? ''),
    [invalid, setInvalid] = useState(false)
  const t = scorecard.templateVersion
  if (!t) return <p>A scorecard has not been configured for this job.</p>
  const change = (criterionId: string, patch: Partial<Response>) =>
    setResponses((old) => {
      const current = old.find((x) => x.criterionId === criterionId) ?? {
        criterionId,
        ratingValue: null,
        textValue: null,
        comment: null,
      }
      return [
        ...old.filter((x) => x.criterionId !== criterionId),
        { ...current, ...patch },
      ]
    })
  const incomplete =
    t.criteria.some(
      (c) =>
        c.required &&
        !(c.type === 'RATING'
          ? responses.find((r) => r.criterionId === c.id)?.ratingValue
          : responses.find((r) => r.criterionId === c.id)?.textValue?.trim()),
    ) || !recommendation
  return (
    <form
      className="grid gap-6"
      aria-busy={busy}
      onSubmit={(e) => {
        e.preventDefault()
        if (busy) return
        if (incomplete) {
          setInvalid(true)
          return
        }
        onSubmit(responses, recommendation, comment)
      }}
    >
      {t.instructions ? (
        <p className="whitespace-pre-wrap rounded-control bg-surface-muted p-4 text-sm text-text-secondary">
          {t.instructions}
        </p>
      ) : null}
      {[...t.criteria]
        .sort((a, b) => a.position - b.position)
        .map((c) => {
          const r = responses.find((x) => x.criterionId === c.id)
          return (
            <fieldset
              key={c.id}
              className="min-w-0 rounded-card border border-border bg-surface p-4 sm:p-5"
            >
              <legend className="px-1 text-base font-bold text-text-primary">
                {c.label}
                {c.required ? (
                  <>
                    <span aria-hidden="true"> *</span>
                    <span className="sr-only"> required</span>
                  </>
                ) : null}
              </legend>
              {c.description ? (
                <p className="mb-3 text-sm text-text-secondary">
                  {c.description}
                </p>
              ) : null}
              {c.type === 'RATING' ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <label
                      key={v}
                      className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-border px-3 text-sm font-semibold transition-colors hover:bg-primary-soft has-[:checked]:border-primary-dark has-[:checked]:bg-primary-soft has-[:checked]:text-primary-dark focus-within:outline-3 focus-within:outline-primary-dark"
                    >
                      <input
                        type="radio"
                        name={`rating-${c.id}`}
                        checked={r?.ratingValue === v}
                        onChange={() => {
                          change(c.id, { ratingValue: v })
                          setInvalid(false)
                        }}
                      />
                      {v}
                    </label>
                  ))}
                </div>
              ) : (
                <Textarea
                  aria-label={`${c.label} response`}
                  value={r?.textValue ?? ''}
                  maxLength={10000}
                  onChange={(e) => {
                    change(c.id, { textValue: e.target.value || null })
                    setInvalid(false)
                  }}
                />
              )}
              <label className="mt-4 grid gap-2 text-sm font-semibold">
                {c.label} comment (optional)
                <Textarea
                  value={r?.comment ?? ''}
                  maxLength={5000}
                  onChange={(e) =>
                    change(c.id, { comment: e.target.value || null })
                  }
                />
              </label>
            </fieldset>
          )
        })}
      <fieldset className="min-w-0 rounded-card border border-border bg-surface p-4 sm:p-5">
        <legend className="px-1 text-base font-bold text-text-primary">
          Overall Recommendation <span aria-hidden="true">*</span>
          <span className="sr-only"> required</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {choices.map((v) => (
            <label
              key={v}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-border px-3 text-sm font-semibold transition-colors hover:bg-primary-soft has-[:checked]:border-primary-dark has-[:checked]:bg-primary-soft has-[:checked]:text-primary-dark focus-within:outline-3 focus-within:outline-primary-dark"
            >
              <input
                type="radio"
                name="recommendation"
                checked={recommendation === v}
                onChange={() => {
                  setRecommendation(v)
                  setInvalid(false)
                }}
              />
              {v.replaceAll('_', ' ')}
            </label>
          ))}
        </div>
        <label className="mt-4 grid gap-2 text-sm font-semibold">
          Overall Comments
          <Textarea
            value={comment}
            maxLength={10000}
            onChange={(e) => setComment(e.target.value)}
          />
        </label>
      </fieldset>
      {invalid ? (
        <p role="alert" className="text-sm text-red-800">
          Answer all required criteria and select an overall recommendation
          before submitting.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3 border-t border-border pt-5">
        <Button
          type="button"
          variant="secondary"
          loading={busy}
          onClick={() => {
            if (!busy) onSave(responses, recommendation, comment)
          }}
        >
          Save Draft
        </Button>
        <Button type="submit" disabled={busy}>
          Submit Scorecard
        </Button>
      </div>
    </form>
  )
}
