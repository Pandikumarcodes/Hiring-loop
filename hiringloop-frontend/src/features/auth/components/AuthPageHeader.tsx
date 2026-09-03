interface AuthPageHeaderProps {
  description: string
  title: string
}

export function AuthPageHeader({ description, title }: AuthPageHeaderProps) {
  return (
    <header className="auth-page-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  )
}
