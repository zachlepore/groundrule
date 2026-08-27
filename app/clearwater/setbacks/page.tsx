import { SetbacksWorkflow } from "./workflow";
export const dynamic="force-dynamic";export const revalidate=0;
export default async function ClearwaterSetbacksPage({searchParams}:{searchParams:Promise<{address?:string;project?:string}>}){const query=await searchParams;return <SetbacksWorkflow initialAddress={query.address} openProject={query.project==="setbacks"}/>;}
