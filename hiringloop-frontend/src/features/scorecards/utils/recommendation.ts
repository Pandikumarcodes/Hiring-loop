export const recommendationLabel = (value: string | null) =>
  value?.replaceAll('_', ' ') ?? 'Not provided'
