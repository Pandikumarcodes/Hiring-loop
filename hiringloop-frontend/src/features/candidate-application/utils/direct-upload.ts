import { ApiError } from '../../../shared/lib/apiErrors'

export async function putResumeToSignedUrl(
  signedUploadUrl: string,
  file: File,
  requiredHeaders: Readonly<Record<string, string>>,
) {
  try {
    const response = await fetch(signedUploadUrl, {
      method: 'PUT',
      body: file,
      credentials: 'omit',
      headers: requiredHeaders,
    })
    if (!response.ok)
      throw new ApiError({
        kind: 'http',
        status: response.status,
        code: 'RESUME_UPLOAD_FAILED',
        message: 'The resume could not be uploaded.',
      })
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError({
      kind: 'network',
      code: 'RESUME_UPLOAD_FAILED',
      message: 'The resume could not be uploaded.',
      cause: error,
    })
  }
}
