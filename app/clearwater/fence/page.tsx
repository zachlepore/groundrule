import { FenceWorkflow } from "./workflow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClearwaterFencePage({ searchParams }: { searchParams: Promise<{ address?: string; project?: string }> }) {
  const query = await searchParams;
  return <FenceWorkflow initialAddress={query.address} openProject={query.project === "fence"} />;
}
