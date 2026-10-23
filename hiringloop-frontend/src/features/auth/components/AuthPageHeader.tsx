interface AuthPageHeaderProps {
  description: string
  title: string
}

export function AuthPageHeader({ description, title }: AuthPageHeaderProps) {
  return (
    <header className="mb-6 min-w-0">
      <h1 className="text-2xl font-bold leading-tight tracking-tight text-text-primary [overflow-wrap:anywhere] sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-text-secondary">
        {description}
      </p>
    </header>
  )
}
