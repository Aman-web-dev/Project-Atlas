import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  type ProfileRow = { full_name: string | null; avatar_url: string | null };

  const profileRes = await supabase
    .from("profiles")
    .select("full_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileRes.data as ProfileRow | null) ?? null;

  const meta = (user.user_metadata ?? {}) as { full_name?: string };

  const headerUser = {
    email: user.email ?? "",
    fullName: profile?.full_name ?? meta.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Server-rendered user context for client components */}
        <DashboardHeaderSlot user={headerUser} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">{children}</div>
        </main>
      </div>
    </div>
  );
}

async function DashboardHeaderSlot({
  user,
}: {
  user: { email: string; fullName: string | null; avatarUrl: string | null };
}) {
  // Server component that imports the client header
  const { DashboardHeader } = await import("@/components/dashboard/dashboard-header");
  return <DashboardHeader user={user} />;
}
