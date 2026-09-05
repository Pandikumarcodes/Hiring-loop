interface BrandMarkProps {
  compact?: boolean
  className?: string
}

export function BrandMark({ compact = false, className = '' }: BrandMarkProps) {
  return (
    <div
      className={`inline-flex items-center gap-3 text-xl font-bold tracking-tight ${className}`.trim()}
      aria-label="HiringLoop"
    >
      <svg
        aria-hidden="true"
        className="h-9 w-9 text-primary"
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="10" fill="currentColor" />
        <path
          d="M11 12v16m18-16v16M11 20h18"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <circle cx="20" cy="20" r="3" fill="white" />
      </svg>
      {!compact ? <span>HiringLoop</span> : null}
    </div>
  )
}
