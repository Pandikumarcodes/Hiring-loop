export const toTalentPoolDto = (pool) => ({
  id: pool.id,
  name: pool.name,
  description: pool.description,
  revision: pool.revision,
  createdAt: pool.createdAt,
  updatedAt: pool.updatedAt,
  memberCount: pool['_count']?.members ?? pool.memberCount ?? 0,
});
export const toTalentPoolMemberDto = (member) => ({
  id: member.id,
  candidate: {
    id: member.candidate.id,
    firstName: member.candidate.firstName,
    lastName: member.candidate.lastName,
    email: member.candidate.email,
  },
  sourceApplicationId: member.sourceApplicationId,
  note: member.note,
  createdAt: member.createdAt,
});
