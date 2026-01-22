"use client";

import { Bell, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  type: "no-reminders" | "no-results";
  searchQuery?: string;
  onCreateClick?: () => void;
  className?: string;
}

export function EmptyState({ type, searchQuery, onCreateClick, className }: EmptyStateProps) {
  if (type === "no-results") {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-200 to-orange-300 rounded-full blur-2xl opacity-30 animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200/50 flex items-center justify-center shadow-lg">
            <Search className="w-9 h-9 text-amber-600" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-zinc-800 mb-2 tracking-tight">
          No matches found
        </h3>
        <p className="text-zinc-500 text-center max-w-sm leading-relaxed">
          No reminders match{" "}
          <span className="font-medium text-zinc-700">"{searchQuery}"</span>. Try a
          different search term.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-300 to-indigo-400 rounded-full blur-2xl opacity-25 animate-pulse" />
        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-100 border border-violet-200/50 flex items-center justify-center shadow-xl shadow-violet-500/10">
          <Bell className="w-11 h-11 text-violet-600" strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="text-2xl font-semibold text-zinc-800 mb-2 tracking-tight">
        No reminders yet
      </h3>
      <p className="text-zinc-500 text-center max-w-md leading-relaxed mb-8">
        Create your first reminder and never miss an important moment. We'll call you at the scheduled time.
      </p>

      {onCreateClick && (
        <Button
          onClick={onCreateClick}
          className={cn(
            "h-12 px-6 text-base font-medium transition-all duration-300",
            "bg-gradient-to-r from-violet-600 to-indigo-600",
            "hover:from-violet-500 hover:to-indigo-500",
            "shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30"
          )}
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Your First Reminder
        </Button>
      )}
    </div>
  );
}
