type Event={occurredAt:Date;newStatus:string;previousStatus:string|null;newRole?:string;previousRole?:string|null};
type Access={startedAt:Date|null;firstActivatedAt:Date|null;expiresAt:Date|null;gracePeriodEndsAt:Date|null;finishedAt:Date|null};
type Member={joinedAt:Date;removedAt:Date|null;finishedAt?:Date|null;status:string;role?:string;events:Event[];subscriptions?:Access[]};
// Reconstruct membership state and recorded access intervals at the exclusive bucket boundary.
export function activeMembershipsAt(members:Member[],cutoff:Date){return members.filter(m=>{
 if(m.joinedAt>=cutoff)return false;
 const endedAt=m.removedAt??m.finishedAt;
 let status=m.events[0]?.previousStatus??(endedAt&&endedAt>=cutoff?"ACTIVE":m.status);
 let role=m.events[0]?.previousRole??m.role;
 if(m.events.length&&m.events[0].previousStatus===null)status="INACTIVE";
 for(const e of m.events){if(e.occurredAt>=cutoff)break;status=e.newStatus;role=e.newRole??role;}
 if(!m.events.length&&endedAt&&endedAt<cutoff)status="REMOVED";
 if(status!=="ACTIVE")return false;
 if(role==="CLUB_ADMIN"||!m.subscriptions)return true;
 return m.subscriptions.some(s=>{const begin=s.firstActivatedAt??s.startedAt;const end=s.gracePeriodEndsAt&&(!s.expiresAt||s.gracePeriodEndsAt>s.expiresAt)?s.gracePeriodEndsAt:s.expiresAt;return begin&&begin<cutoff&&end&&end>=cutoff&&(!s.finishedAt||s.finishedAt>=cutoff)});
 }).length;}
