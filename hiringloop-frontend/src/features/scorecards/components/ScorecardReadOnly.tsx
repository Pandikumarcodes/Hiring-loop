import type { Response, TemplateVersion } from '../types/scorecard.types'
import { recommendationLabel } from '../utils/recommendation'
export function ScorecardReadOnly({
  template,
  responses,
  recommendation,
  comment,
  submittedAt,
}: {
  template: TemplateVersion
  responses: readonly Response[]
  recommendation: string | null
  comment: string | null
  submittedAt?: string | null
}) {
  const byId = new Map(responses.map((r) => [r.criterionId, r]))
  return (
    <div className="grid gap-5">
      {template.instructions ? (
        <p className="whitespace-pre-wrap text-text-secondary">
          {template.instructions}
        </p>
      ) : null}
      {[...template.criteria]
        .sort((a, b) => a.position - b.position)
        .map((c) => {
          const r = byId.get(c.id)
          return (
            <section key={c.id}>
              <h3 className="font-semibold">{c.label}</h3>
              {c.description ? (
                <p className="mt-1 text-sm text-text-secondary">
                  {c.description}
                </p>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap">
                {c.type === 'RATING'
                  ? r?.ratingValue
                    ? `${r.ratingValue} / 5`
                    : 'Not answered'
                  : r?.textValue || 'Not answered'}
              </p>
              {r?.comment ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                  Comment: {r.comment}
                </p>
              ) : null}
            </section>
          )
        })}
      <section>
        <h3 className="font-semibold">Overall recommendation</h3>
        <p className="mt-1">{recommendationLabel(recommendation)}</p>
        {comment ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
            {comment}
          </p>
        ) : null}
        {submittedAt ? (
          <p className="mt-2 text-sm text-text-secondary">
            Submitted: {new Date(submittedAt).toLocaleString()}
          </p>
        ) : null}
      </section>
    </div>
  )
}
