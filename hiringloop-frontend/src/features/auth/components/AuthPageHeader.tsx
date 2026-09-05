interface AuthPageHeaderProps {
  description: string
  title: string
}

export function AuthPageHeader({ description, title }: AuthPageHeaderProps) {
  return (
    <header className="mb-6 min-w-0 sm:mb-8">
      <h1 className="text-[clamp(1.75rem,5vw,2.25rem)] font-bold leading-tight tracking-tight text-text-primary">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-6 text-text-secondary">
        {description}
      </p>
    </header>
  )
}
