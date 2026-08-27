import { ShortTermRentalWorkflow } from "./workflow";
export const dynamic="force-dynamic";export const revalidate=0;
export default async function ClearwaterShortTermRentalPage({searchParams}:{searchParams:Promise<{address?:string;project?:string}>}){const query=await searchParams;return <ShortTermRentalWorkflow initialAddress={query.address} openProject={query.project==="short-term-rental"}/>;}
