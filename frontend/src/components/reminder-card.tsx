"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { api, Reminder } from "@/lib/api";

// Parse datetime string as UTC (append Z if not present)
function parseAsUTC(dateString: string): Date {
  if (!dateString.endsWith("Z") && !dateString.includes("+")) {
    return new Date(dateString + "Z");
  }
  return new Date(dateString);
}
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReminderForm } from "@/components/reminder-form";
import { toast } from "sonner";
import {
  Phone,
  Calendar,
  Clock,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Timer,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReminderCardProps {
  reminder: Reminder;
}

function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return phone.slice(0, -4).replace(/\d(?=.{4})/g, "•") + phone.slice(-4);
}

function getStatusConfig(status: Reminder["status"]) {
  switch (status) {
    case "scheduled":
      return {
        label: "Scheduled",
        icon: Timer,
        className: "bg-sky-100 text-sky-700 border-sky-200",
      };
    case "completed":
      return {
        label: "Completed",
        icon: CheckCircle2,
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "failed":
      return {
        label: "Failed",
        icon: XCircle,
        className: "bg-red-100 text-red-700 border-red-200",
      };
  }
}

function useCountdown(targetDate: Date, enabled: boolean) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!enabled) {
      setTimeLeft("");
      return;
    }

    const updateCountdown = () => {
      if (isPast(targetDate)) {
        setTimeLeft("Processing...");
        return;
      }
      setTimeLeft(formatDistanceToNow(targetDate, { addSuffix: false }));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDate, enabled]);

  return timeLeft;
}

export function ReminderCard({ reminder }: ReminderCardProps) {
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const statusConfig = getStatusConfig(reminder.status);
  const StatusIcon = statusConfig.icon;

  // Parse as UTC, then convert to the stored timezone for display
  const utcDate = parseAsUTC(reminder.scheduled_at);
  const displayDate = toZonedTime(utcDate, reminder.timezone);
  const countdown = useCountdown(utcDate, reminder.status === "scheduled");

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteReminder(reminder.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder deleted", {
        description: "The reminder has been removed.",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete reminder", {
        description: error.message,
      });
    },
  });

  return (
    <>
      <div
        className={cn(
          "group relative bg-white rounded-xl border border-zinc-200/80",
          "shadow-sm hover:shadow-md transition-all duration-300",
          "hover:border-zinc-300/80",
          "overflow-hidden"
        )}
      >
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />

        <div className="p-5 pt-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-zinc-900 text-lg tracking-tight truncate mb-1">
                {reminder.title}
              </h3>
              <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">
                {reminder.message}
              </p>
            </div>

            <Badge
              variant="outline"
              className={cn(
                "shrink-0 font-medium border",
                statusConfig.className
              )}
            >
              <StatusIcon className="w-3.5 h-3.5 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600 mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <span>{format(displayDate, "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span>{format(displayDate, "h:mm a")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-zinc-400" />
              <span className="font-mono text-xs">{maskPhone(reminder.phone_number)}</span>
            </div>
          </div>

          {/* Countdown / Error message */}
          {reminder.status === "scheduled" && countdown && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 border border-sky-100 mb-4">
              <Timer className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-medium text-sky-700">
                {countdown === "Processing..." ? countdown : `Calls in ${countdown}`}
              </span>
            </div>
          )}

          {reminder.status === "failed" && reminder.error_message && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 mb-4">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span className="text-sm text-red-700 line-clamp-2">
                {reminder.error_message}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
            {reminder.status === "scheduled" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="h-9 px-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              >
                <Pencil className="w-4 h-4 mr-1.5" />
                Edit
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-zinc-600 hover:text-red-600 hover:bg-red-50"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1.5" />
                  )}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete reminder?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{reminder.title}". This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit Reminder</DialogTitle>
          </DialogHeader>
          <div className="max-h-[85vh] overflow-y-auto">
            <ReminderForm
              reminder={reminder}
              onSuccess={() => setIsEditOpen(false)}
              onCancel={() => setIsEditOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ReminderCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200/80 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-300 to-indigo-300 animate-pulse" />
      <div className="p-5 pt-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-zinc-200 rounded-md w-3/4 animate-pulse" />
            <div className="h-4 bg-zinc-100 rounded-md w-full animate-pulse" />
          </div>
          <div className="h-6 bg-zinc-200 rounded-full w-24 animate-pulse" />
        </div>
        <div className="flex gap-4">
          <div className="h-5 bg-zinc-100 rounded w-28 animate-pulse" />
          <div className="h-5 bg-zinc-100 rounded w-20 animate-pulse" />
          <div className="h-5 bg-zinc-100 rounded w-32 animate-pulse" />
        </div>
        <div className="pt-2 border-t border-zinc-100 flex gap-2">
          <div className="h-9 bg-zinc-100 rounded w-16 animate-pulse" />
          <div className="h-9 bg-zinc-100 rounded w-18 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
