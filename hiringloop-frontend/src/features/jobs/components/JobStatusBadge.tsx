import { Badge } from '../../../shared/components/ui'
import type { JobStatus } from '../types/job.types'
import { statusVariant } from '../utils/job-utils'
export const JobStatusBadge = ({ status }: { status: JobStatus }) => (
  <Badge
    variant={statusVariant(status)}
    className="shrink-0 whitespace-nowrap [overflow-wrap:normal]"
  >
    {status[0] + status.slice(1).toLowerCase()}
  </Badge>
)
