export function toMemberDto(membership) {
  return {
    id: membership.id,
    role: membership.role,
    joinedAt: membership.createdAt,
    user: {
      id: membership.user.id,
      email: membership.user.email,
    },
  };
}
