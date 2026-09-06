import { queryOptions, useQuery } from '@tanstack/react-query'
import {
  getPublicCareerJob,
  getPublicCareerJobs,
} from '../api/public-careers.api'
import { publicCareerKeys } from './query-keys'

export const publicCareerJobsQueryOptions = (
  slug: string,
  page: number,
  pageSize: number,
) =>
  queryOptions({
    queryKey: publicCareerKeys.jobs(slug, page, pageSize),
    queryFn: ({ signal }) => getPublicCareerJobs(slug, page, pageSize, signal),
    enabled: Boolean(slug),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  })
export const publicCareerJobQueryOptions = (slug: string, jobId: string) =>
  queryOptions({
    queryKey: publicCareerKeys.job(slug, jobId),
    queryFn: ({ signal }) => getPublicCareerJob(slug, jobId, signal),
    enabled: Boolean(slug && jobId),
    staleTime: 30_000,
  })
export const usePublicCareerJobs = (
  slug: string,
  page: number,
  pageSize: number,
) => useQuery(publicCareerJobsQueryOptions(slug, page, pageSize))
export const usePublicCareerJob = (slug: string, jobId: string) =>
  useQuery(publicCareerJobQueryOptions(slug, jobId))
