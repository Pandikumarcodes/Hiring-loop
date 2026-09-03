import { PageHeader } from '../../shared/components/ui'

interface FoundationPageProps {
  context?: 'public' | 'application'
}

export function FoundationPage({ context = 'public' }: FoundationPageProps) {
  const isApplication = context === 'application'

  return (
    <section className="foundation-page">
      <p className="eyebrow">
        {isApplication ? 'Application shell' : 'Foundation'}
      </p>
      <PageHeader
        title={
          isApplication
            ? 'Neutral application layout'
            : 'HiringLoop frontend foundation'
        }
        description={
          isApplication
            ? 'This route demonstrates the application layout seam without product navigation or feature behavior.'
            : 'The frontend shell is ready for approved product work. No product workflows are implemented yet.'
        }
      />
    </section>
  )
}
