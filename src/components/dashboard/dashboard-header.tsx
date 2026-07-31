"use client";

import { signOut } from "@/app/(auth)/actions";
import { Header } from "./header";

interface DashboardHeaderProps {
  user: {
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <Header
      user={{
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      }}
      onSignOut={async () => {
        await signOut();
      }}
    />
  );
}
