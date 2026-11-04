import type { Prisma } from "@prisma/client";

export function activeMember(now = new Date()): Prisma.ClubMembershipWhereInput {
  return {status:"ACTIVE", OR:[
    {role:"CLUB_ADMIN"},
    {subscriptions:{some:{startedAt:{lte:now}, OR:[
      {status:"ACTIVE", expiresAt:{gt:now}},
      {status:"PENDING_PAYMENT", gracePeriodEndsAt:{gt:now}}
    ]}}}
  ]};
}
