"use client";

import { useState } from "react";
import { ReminderForm } from "@/components/reminder-form";
import { ReminderList } from "@/components/reminder-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100/50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
                  Call Me Reminder
                </h1>
                <p className="text-xs text-zinc-500 hidden sm:block">
                  Never miss an important moment
                </p>
              </div>
            </div>

            <Button
              onClick={() => setIsCreateOpen(true)}
              className={cn(
                "h-10 px-4 font-medium transition-all duration-300",
                "bg-gradient-to-r from-violet-600 to-indigo-600",
                "hover:from-violet-500 hover:to-indigo-500",
                "shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/25"
              )}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Reminder</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight mb-1">
            Your Reminders
          </h2>
          <p className="text-zinc-500">
            Manage your scheduled phone call reminders
          </p>
        </div>

        <ReminderList onCreateClick={() => setIsCreateOpen(true)} />
      </main>

      {/* Create Reminder Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Create Reminder</DialogTitle>
          </DialogHeader>
          <ReminderForm onSuccess={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-zinc-200/50 bg-white/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-zinc-400">
            Call Me Reminder &middot; Built with Next.js & FastAPI
          </p>
        </div>
      </footer>
    </div>
  );
}
