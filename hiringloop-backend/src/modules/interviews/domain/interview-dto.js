function candidateName(candidate) {
  return `${candidate.firstName} ${candidate.lastName}`.trim();
}

function applicationSummary(application) {
  return {
    id: application.id,
    candidate: {
      id: application.candidate.id,
      name: candidateName(application.candidate),
      email: application.candidate.email,
    },
    job: {
      id: application.job.id,
      title: application.job.title,
    },
  };
}

export function toInterviewDto(interview) {
  return {
    id: interview.id,
    title: interview.title,
    format: interview.format,
    status: interview.status,
    scheduledStartAt: interview.scheduledStartAt,
    scheduledEndAt: interview.scheduledEndAt,
    timeZone: interview.timeZone,
    meetingUrl: interview.meetingUrl,
    location: interview.location,
    participants: interview.participants.map((participant) => ({
      id: participant.id,
      user: {
        id: participant.user.id,
        email: participant.user.email,
      },
    })),
    application: applicationSummary(interview.application),
    cancellation:
      interview.status === 'CANCELLED'
        ? {
            cancelledAt: interview.cancelledAt,
            cancelledByUserId: interview.cancelledByUserId,
            reason: interview.cancellationReason,
          }
        : null,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
  };
}
