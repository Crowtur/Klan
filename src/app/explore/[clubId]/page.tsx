import { PublicClub } from "@/components/workspace/personal";
import "@/components/workspace/workspace.css";
export default async function Page({
  params,searchParams,
}: {
  searchParams: Promise<{post?:string}>;
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  return (
    <main id="main-content" className="workspace">
      <PublicClub club={clubId} target={(await searchParams).post}/>
    </main>
  );
}
