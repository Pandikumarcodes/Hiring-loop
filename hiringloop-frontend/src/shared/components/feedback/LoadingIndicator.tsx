interface LoadingIndicatorProps {
  label?: string
  block?: boolean
}

export function LoadingIndicator({
  label = 'Loading',
  block = false,
}: LoadingIndicatorProps) {
  return (
    <span
      aria-label={label}
      className={`feedback-loading${block ? ' feedback-loading--block' : ''}`}
      role="status"
    >
      <span className="feedback-loading__spinner" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
