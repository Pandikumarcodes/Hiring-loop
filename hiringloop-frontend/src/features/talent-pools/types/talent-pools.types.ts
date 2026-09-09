export interface TalentPoolDto {
  id: string
  name: string
  description: string | null
  revision: number
  createdAt: string
  updatedAt: string
  memberCount: number
}
export interface TalentPoolPageDto {
  pools: readonly TalentPoolDto[]
  pagination: { page: number; pageSize: number; totalItems: number }
}
export interface TalentPoolMemberDto {
  id: string
  candidate: { id: string; firstName: string; lastName: string; email: string }
  sourceApplicationId: string | null
  note: string | null
  createdAt: string
}
export interface TalentPoolMembersDto {
  members: readonly TalentPoolMemberDto[]
  pagination: { page: number; pageSize: number }
}
