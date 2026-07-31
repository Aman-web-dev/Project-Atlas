"use client";

import Link from "next/link";
import { Bell, ChevronDown, LogOut, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  user?: {
    email: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  } | null;
  onSignOut?: () => void;
}

export function Header({ user, onSignOut }: HeaderProps) {
  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? user?.email[0].toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search campaigns, assets, agents…"
          className="h-9 pl-9"
          aria-label="Global search"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">
                {user?.fullName || user?.email?.split("@")[0] || "Account"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">
                  {user?.fullName || "Atlas user"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
