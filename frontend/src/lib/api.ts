const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Reminder {
  id: number;
  title: string;
  message: string;
  phone_number: string;
  scheduled_at: string;
  timezone: string;
  status: "scheduled" | "completed" | "failed";
  call_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReminderData {
  title: string;
  message: string;
  phone_number: string;
  scheduled_at: string;
  timezone: string;
}

export interface UpdateReminderData {
  title?: string;
  message?: string;
  phone_number?: string;
  scheduled_at?: string;
  timezone?: string;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "An error occurred" }));
    throw new ApiError(response.status, error.detail || "An error occurred");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export const api = {
  async getReminders(params?: {
    status?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<Reminder[]> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== "all") {
      searchParams.set("status", params.status);
    }
    if (params?.search) {
      searchParams.set("search", params.search);
    }
    if (params?.sort_by) {
      searchParams.set("sort_by", params.sort_by);
    }
    if (params?.sort_order) {
      searchParams.set("sort_order", params.sort_order);
    }
    const url = `${API_URL}/reminders${searchParams.toString() ? `?${searchParams}` : ""}`;
    const response = await fetch(url);
    return handleResponse<Reminder[]>(response);
  },

  async getReminder(id: number): Promise<Reminder> {
    const response = await fetch(`${API_URL}/reminders/${id}`);
    return handleResponse<Reminder>(response);
  },

  async createReminder(data: CreateReminderData): Promise<Reminder> {
    const response = await fetch(`${API_URL}/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Reminder>(response);
  },

  async updateReminder(id: number, data: UpdateReminderData): Promise<Reminder> {
    const response = await fetch(`${API_URL}/reminders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Reminder>(response);
  },

  async deleteReminder(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/reminders/${id}`, {
      method: "DELETE",
    });
    return handleResponse<void>(response);
  },
};
