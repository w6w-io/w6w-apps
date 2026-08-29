import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  personId?: number;
  userId?: number;
  currentState?: "scheduled" | "completed";
  taskType?: "call" | "email" | "general";
  timeIntervalFilter?: string;
  perPage?: number;
  page?: number;
}

/** GET /v2/tasks — list/filter tasks. */
const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description: "List and filter tasks.",
  params: [
    { key: "personId", label: "Person ID", type: "number" },
    { key: "userId", label: "User ID", type: "number" },
    {
      key: "currentState",
      label: "Current state",
      type: "select",
      options: [{ value: "scheduled", label: "Scheduled" }, {
        value: "completed",
        label: "Completed",
      }],
    },
    {
      key: "taskType",
      label: "Task type",
      type: "select",
      options: [
        { value: "call", label: "Call" },
        { value: "email", label: "Email" },
        { value: "general", label: "General" },
      ],
    },
    {
      key: "timeIntervalFilter",
      label: "Time interval",
      type: "select",
      options: [
        { value: "overdue", label: "Overdue" },
        { value: "today", label: "Today" },
        { value: "tomorrow", label: "Tomorrow" },
        { value: "this_week", label: "This week" },
        { value: "next_week", label: "Next week" },
      ],
    },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "1–100." },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "data", type: "array", label: "Tasks" },
    { key: "metadata", type: "object", label: "Paging metadata" },
  ],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/tasks", {
      query: compact({
        person_id: input.personId,
        user_id: input.userId,
        current_state: input.currentState,
        task_type: input.taskType,
        time_interval_filter: input.timeIntervalFilter,
        per_page: input.perPage,
        page: input.page,
      }),
    });
  },
};

export default taskList;
