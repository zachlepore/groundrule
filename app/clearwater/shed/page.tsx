import { ShedWorkflow } from "./workflow";
export const dynamic = "force-dynamic"; export const revalidate = 0;
export default async function ClearwaterShedPage({searchParams}:{searchParams:Promise<{address?:string;project?:string}>}) { const query=await searchParams; return <ShedWorkflow initialAddress={query.address} openProject={query.project==="shed"} />; }
