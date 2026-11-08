import {getCurrentUser} from "@/lib/auth/auth";

export async function GET(request:Request){
  const user=await getCurrentUser(request);
  return Response.json({user:user&&{firstName:user.firstName,lastName:user.lastName,email:user.email,avatarUrl:user.avatarUrl}},
    {headers:{"Cache-Control":"private, no-store"}});
}
