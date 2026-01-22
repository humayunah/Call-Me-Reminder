"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, Reminder } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReminderCard, ReminderCardSkeleton } from "@/components/reminder-card";
import { EmptyState } from "@/components/empty-state";
import { Search, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

type StatusFilter = "all" | "scheduled" | "completed" | "failed";

interface ReminderListProps {
  onCreateClick?: () => void;
}

export function ReminderList({ onCreateClick }: ReminderListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: reminders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reminders", statusFilter],
    queryFn: () =>
      api.getReminders({
        status: statusFilter === "all" ? undefined : statusFilter,
        sort_by: "scheduled_at",
        sort_order: "asc",
      }),
  });

  const filteredReminders = useMemo(() => {
    if (!searchQuery.trim()) return reminders;
    const query = searchQuery.toLowerCase();
    return reminders.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.message.toLowerCase().includes(query)
    );
  }, [reminders, searchQuery]);

  const statusCounts = useMemo(() => {
    return {
      all: reminders.length,
      scheduled: reminders.filter((r) => r.status === "scheduled").length,
      completed: reminders.filter((r) => r.status === "completed").length,
      failed: reminders.filter((r) => r.status === "failed").length,
    };
  }, [reminders]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-zinc-800 mb-2">
          Failed to load reminders
        </h3>
        <p className="text-zinc-500 text-center max-w-sm mb-6">
          {error instanceof Error ? error.message : "An unexpected error occurred"}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <TabsList className="h-10 p-1 bg-zinc-100">
            <TabsTrigger value="all" className="px-4 data-[state=active]:bg-white">
              All
              <span className="ml-1.5 text-xs text-zinc-400">
                {statusCounts.all}
              </span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="px-4 data-[state=active]:bg-white">
              Scheduled
              <span className="ml-1.5 text-xs text-zinc-400">
                {statusCounts.scheduled}
              </span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="px-4 data-[state=active]:bg-white">
              Completed
              <span className="ml-1.5 text-xs text-zinc-400">
                {statusCounts.completed}
              </span>
            </TabsTrigger>
            <TabsTrigger value="failed" className="px-4 data-[state=active]:bg-white">
              Failed
              <span className="ml-1.5 text-xs text-zinc-400">
                {statusCounts.failed}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "pl-9 h-10 w-full sm:w-64",
              "border-zinc-200 bg-white",
              "focus:border-violet-500"
            )}
          />
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[200px]">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ReminderCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredReminders.length === 0 ? (
          searchQuery ? (
            <EmptyState type="no-results" searchQuery={searchQuery} />
          ) : reminders.length === 0 ? (
            <EmptyState type="no-reminders" onCreateClick={onCreateClick} />
          ) : (
            <EmptyState type="no-results" searchQuery={statusFilter} />
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredReminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
