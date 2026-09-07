export const toPublicApplicationFormDto = (form) => ({
  versionId: form.activeVersion.id,
  questions: form.activeVersion.questions.map((question) => ({
    id: question.id,
    type: question.type,
    label: question.label,
    description: question.description,
    placeholder: question.placeholder,
    required: question.required,
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label,
      value: option.value,
    })),
  })),
});

export const toUploadReservationDto = (upload, signedUpload) => ({
  uploadId: upload.id,
  signedUploadUrl: signedUpload.url,
  expiresAt: upload.expiresAt,
  requiredHeaders: signedUpload.requiredHeaders,
});

export const toApplicationConfirmationDto = (application) => ({
  submitted: true,
  submittedAt: application.submittedAt,
  job: application.job,
});
