/** Small-form errors stay local to the feature that owns the form. */
export type FieldErrors = Record<string, string>

export interface FormErrors {
  fields?: FieldErrors
  form?: string
}
