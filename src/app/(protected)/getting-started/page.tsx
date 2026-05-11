import { requireAuthUser } from "@/lib/auth";
import { GettingStartedFlow } from "@/components/pmfreak/activation/getting-started-flow";

export default async function GettingStartedPage() {
  await requireAuthUser();
  return <GettingStartedFlow />;
}
