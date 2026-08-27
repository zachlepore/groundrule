import { ImperviousSurfaceRatioWorkflow } from "./workflow";
export const dynamic="force-dynamic";export const revalidate=0;
export default async function Page({searchParams}:{searchParams:Promise<{address?:string;project?:string}>}){const query=await searchParams;return <ImperviousSurfaceRatioWorkflow initialAddress={query.address} openProject={query.project==="impervious-surface-ratio"}/>;}
