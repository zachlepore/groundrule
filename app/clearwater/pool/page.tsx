import {PoolWorkflow} from "./workflow";export const dynamic="force-dynamic";export const revalidate=0;
export default async function ClearwaterPoolPage({searchParams}:{searchParams:Promise<{address?:string;project?:string}>}){const q=await searchParams;return <PoolWorkflow initialAddress={q.address} openProject={q.project==="pool"}/>;}
