import { DashboardLive } from "@/components/DashboardLive";
import { Header } from "@/components/Header";
import { InstructionsProvider } from "@/components/Instructions";
import { requireProfile } from "@/lib/auth";
import { loadDashboard } from "@/lib/dashboard";
import { getInstructions } from "@/lib/instructions";

export default async function Dashboard() {
  const { supabase, user, profile } = await requireProfile();
  const snapshot = await loadDashboard(supabase, user.id);

  return (
    <InstructionsProvider blocks={getInstructions()} autoOpen={!profile.seen_instructions}>
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6 sm:pt-8">
        <Header userId={user.id} name={profile.display_name} current="home" withInstructions />
        <DashboardLive initial={snapshot} userId={user.id} />
      </main>
    </InstructionsProvider>
  );
}
