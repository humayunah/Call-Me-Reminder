"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { api, CreateReminderData, Reminder, UpdateReminderData } from "@/lib/api";

// Parse datetime string as UTC (append Z if not present)
function parseAsUTC(dateString: string): Date {
  if (!dateString.endsWith("Z") && !dateString.includes("+")) {
    return new Date(dateString + "Z");
  }
  return new Date(dateString);
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Phone, Calendar, Clock, MessageSquare, Sparkles, Loader2, Globe, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReminderFormProps {
  reminder?: Reminder;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormErrors {
  title?: string;
  message?: string;
  phone_number?: string;
  date?: string;
  time?: string;
}

function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "+";
  if (digits.length <= 1) return `+${digits}`;
  if (digits.length <= 4) return `+${digits.slice(0, 1)} ${digits.slice(1)}`;
  if (digits.length <= 7) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
  return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
}

function parsePhoneToE164(formatted: string): string {
  const digits = formatted.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

export function ReminderForm({ reminder, onSuccess, onCancel }: ReminderFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!reminder;

  const [title, setTitle] = useState(reminder?.title || "");
  const [message, setMessage] = useState(reminder?.message || "");
  const [phoneDisplay, setPhoneDisplay] = useState(() => {
    if (reminder?.phone_number) {
      return formatPhoneDisplay(reminder.phone_number);
    }
    return "+";
  });
  const [date, setDate] = useState(() => {
    if (reminder?.scheduled_at && reminder?.timezone) {
      // Parse as UTC, convert to stored timezone for display
      const utcDate = parseAsUTC(reminder.scheduled_at);
      const zonedDate = toZonedTime(utcDate, reminder.timezone);
      return format(zonedDate, "yyyy-MM-dd");
    }
    return "";
  });
  const [time, setTime] = useState(() => {
    if (reminder?.scheduled_at && reminder?.timezone) {
      // Parse as UTC, convert to stored timezone for display
      const utcDate = parseAsUTC(reminder.scheduled_at);
      const zonedDate = toZonedTime(utcDate, reminder.timezone);
      return format(zonedDate, "HH:mm");
    }
    return "";
  });
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const createMutation = useMutation({
    mutationFn: (data: CreateReminderData) => api.createReminder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder created", {
        description: "You'll receive a call at the scheduled time.",
      });
      resetForm();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to create reminder", {
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateReminderData) => api.updateReminder(reminder!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder updated", {
        description: "Your changes have been saved.",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to update reminder", {
        description: error.message,
      });
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setPhoneDisplay("+");
    setDate("");
    setTime("");
    setErrors({});
    setTouched({});
  };

  const validateField = useCallback((field: string, value: string): string | undefined => {
    switch (field) {
      case "title":
        if (!value.trim()) return "Title is required";
        if (value.length > 100) return "Title must be under 100 characters";
        return undefined;
      case "message":
        if (!value.trim()) return "Message is required";
        return undefined;
      case "phone_number": {
        const e164 = parsePhoneToE164(value);
        if (!e164 || e164 === "+") return "Phone number is required";
        if (!/^\+[1-9]\d{6,14}$/.test(e164)) return "Enter a valid phone number";
        return undefined;
      }
      case "date":
        if (!value) return "Date is required";
        return undefined;
      case "time":
        if (!value) return "Time is required";
        return undefined;
      default:
        return undefined;
    }
  }, []);

  const validateDateTime = useCallback((): string | undefined => {
    if (!date || !time) return undefined;
    const scheduled = new Date(`${date}T${time}`);
    if (scheduled <= new Date()) {
      return "Scheduled time must be in the future";
    }
    return undefined;
  }, [date, time]);

  useEffect(() => {
    if (touched.date || touched.time) {
      const dateTimeError = validateDateTime();
      if (dateTimeError) {
        setErrors((prev) => ({ ...prev, date: dateTimeError }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (newErrors.date === "Scheduled time must be in the future") {
            delete newErrors.date;
          }
          return newErrors;
        });
      }
    }
  }, [date, time, touched.date, touched.time, validateDateTime]);

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneDisplay(value);
    setPhoneDisplay(formatted);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      title: validateField("title", title),
      message: validateField("message", message),
      phone_number: validateField("phone_number", phoneDisplay),
      date: validateField("date", date) || validateDateTime(),
      time: validateField("time", time),
    };

    setErrors(newErrors);
    setTouched({ title: true, message: true, phone_number: true, date: true, time: true });

    return !Object.values(newErrors).some((error) => error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const scheduledAt = new Date(`${date}T${time}`);
    const phoneNumber = parsePhoneToE164(phoneDisplay);

    if (isEditing) {
      updateMutation.mutate({
        title: title.trim(),
        message: message.trim(),
        phone_number: phoneNumber,
        scheduled_at: scheduledAt.toISOString(),
        timezone,
      });
    } else {
      createMutation.mutate({
        title: title.trim(),
        message: message.trim(),
        phone_number: phoneNumber,
        scheduled_at: scheduledAt.toISOString(),
        timezone,
      });
    }
  };

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <Card className="overflow-hidden border-0 shadow-2xl shadow-black/5 bg-linear-to-b from-white to-zinc-50/50">
      <CardHeader className="pb-2 pt-8 px-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {isEditing ? "Edit Reminder" : "New Reminder"}
          </CardTitle>
        </div>
        <CardDescription className="text-base text-zinc-500 mt-1">
          {isEditing
            ? "Update your scheduled phone call reminder"
            : "Schedule a phone call to remind you of something important"}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-8 pb-8 pt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <Label
              htmlFor="title"
              className="text-sm font-medium text-zinc-700 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              Title
            </Label>
            <Input
              id="title"
              placeholder="Doctor's appointment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleBlur("title", title)}
              aria-invalid={touched.title && !!errors.title}
              disabled={isLoading}
              className={cn(
                "h-12 px-4 text-base transition-all duration-200",
                "border-zinc-200 bg-white",
                "hover:border-zinc-300 focus:border-violet-500",
                "placeholder:text-zinc-400",
                touched.title && errors.title && "border-red-300 bg-red-50/50"
              )}
            />
            {touched.title && errors.title && (
              <p className="text-sm text-red-500 flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <Label
              htmlFor="message"
              className="text-sm font-medium text-zinc-700 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              Message to speak
            </Label>
            <Textarea
              id="message"
              placeholder="Remember to bring your insurance card and arrive 15 minutes early..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => handleBlur("message", message)}
              aria-invalid={touched.message && !!errors.message}
              disabled={isLoading}
              rows={3}
              className={cn(
                "px-4 py-3 text-base transition-all duration-200 resize-none",
                "border-zinc-200 bg-white",
                "hover:border-zinc-300 focus:border-violet-500",
                "placeholder:text-zinc-400",
                touched.message && errors.message && "border-red-300 bg-red-50/50"
              )}
            />
            <p className="text-xs text-zinc-400">
              This message will be spoken when we call you
            </p>
            {touched.message && errors.message && (
              <p className="text-sm text-red-500 flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.message}
              </p>
            )}
          </div>

          {/* Phone Number Field */}
          <div className="space-y-2">
            <Label
              htmlFor="phone"
              className="text-sm font-medium text-zinc-700 flex items-center gap-2"
            >
              <Phone className="w-4 h-4 text-zinc-400" />
              Phone number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneDisplay}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={() => handleBlur("phone_number", phoneDisplay)}
              aria-invalid={touched.phone_number && !!errors.phone_number}
              disabled={isLoading}
              className={cn(
                "h-12 px-4 text-base font-mono transition-all duration-200",
                "border-zinc-200 bg-white",
                "hover:border-zinc-300 focus:border-violet-500",
                "placeholder:text-zinc-400 placeholder:font-sans",
                touched.phone_number && errors.phone_number && "border-red-300 bg-red-50/50"
              )}
            />
            {touched.phone_number && errors.phone_number && (
              <p className="text-sm text-red-500 flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.phone_number}
              </p>
            )}
          </div>

          {/* Date & Time Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="date"
                className="text-sm font-medium text-zinc-700 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-zinc-400" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onBlur={() => handleBlur("date", date)}
                min={minDate}
                aria-invalid={touched.date && !!errors.date}
                disabled={isLoading}
                className={cn(
                  "h-12 px-4 text-base transition-all duration-200",
                  "border-zinc-200 bg-white",
                  "hover:border-zinc-300 focus:border-violet-500",
                  touched.date && errors.date && "border-red-300 bg-red-50/50"
                )}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="time"
                className="text-sm font-medium text-zinc-700 flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-zinc-400" />
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                onBlur={() => handleBlur("time", time)}
                aria-invalid={touched.time && !!errors.time}
                disabled={isLoading}
                className={cn(
                  "h-12 px-4 text-base transition-all duration-200",
                  "border-zinc-200 bg-white",
                  "hover:border-zinc-300 focus:border-violet-500",
                  touched.time && errors.time && "border-red-300 bg-red-50/50"
                )}
              />
            </div>
          </div>

          {(touched.date && errors.date) || (touched.time && errors.time) ? (
            <p className="text-sm text-red-500 flex items-center gap-1.5 -mt-3 animate-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.date || errors.time}
            </p>
          ) : null}

          {/* Timezone Display */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-100/80 border border-zinc-200/50">
            <Globe className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-600">
              Timezone: <span className="font-medium text-zinc-800">{timezone}</span>
            </span>
          </div>

          {/* Submit Button */}
          <div className={cn("flex gap-3 pt-2", isEditing ? "justify-end" : "")}>
            {isEditing && onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="h-12 px-6"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                "h-12 text-base font-medium transition-all duration-300",
                "bg-linear-to-r from-violet-600 to-indigo-600",
                "hover:from-violet-500 hover:to-indigo-500",
                "shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                isEditing ? "px-8" : "w-full"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isEditing ? "Saving..." : "Creating..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {isEditing ? "Save Changes" : "Create Reminder"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
