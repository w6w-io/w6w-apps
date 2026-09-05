import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, type BaseSearchResponse, compact } from "../lib/client.ts";
import { pageParams, taskStatusOptions } from "../lib/params.ts";

/** `POST /v1/api/tasks/list` — search tasks. AgencyZoom's own page size ceiling here is 200. */
interface Input {
  startDate?: string;
  endDate?: string;
  type?: "sales" | "onboarding";
  assigneeId?: number;
  lifeProfessionalId?: number;
  status?: number;
  period?: "past-due-rotting" | "past-due" | "remainder-week" | "next-week" | "today";
  leadSourceCategoryId?: number;
  leadSourceId?: number;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

interface Task {
  id?: number;
  title?: string;
  status?: number;
  dueDate?: string;
  customerId?: number;
  customerType?: "customer" | "lead";
}

interface TaskSearchResponse extends BaseSearchResponse {
  tasks?: Task[];
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "Search Tasks",
  description: "Search tasks by status, assignee, type, source or a predefined due-date period.",
  params: [
    {
      key: "type",
      label: "Task category",
      type: "select",
      options: [{ value: "sales", label: "Sales" }, { value: "onboarding", label: "Onboarding" }],
    },
    { key: "assigneeId", label: "Assignee ID", type: "number", hint: "From List Employees." },
    { key: "lifeProfessionalId", label: "Life & Health Professional ID", type: "number" },
    { key: "status", label: "Status", type: "select", options: taskStatusOptions },
    {
      key: "period",
      label: "Due-date period",
      type: "select",
      options: [
        { value: "past-due-rotting", label: "Past due (rotting)" },
        { value: "past-due", label: "Past due" },
        { value: "remainder-week", label: "Remainder of this week" },
        { value: "next-week", label: "Next week" },
        { value: "today", label: "Today" },
      ],
    },
    { key: "leadSourceCategoryId", label: "Lead source category ID", type: "number" },
    { key: "leadSourceId", label: "Lead source ID", type: "number" },
    { key: "startDate", label: "Created on/after", type: "string", hint: "YYYY-MM-DD." },
    { key: "endDate", label: "Created on/before", type: "string", hint: "YYYY-MM-DD." },
    { key: "sort", label: "Sort by", type: "string" },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    ...pageParams(200),
  ],
  output: [
    { key: "tasks", type: "array", label: "Tasks" },
    { key: "totalCount", type: "number", label: "Total matching tasks" },
    { key: "page", type: "number", label: "Page returned" },
    { key: "pageSize", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).post<TaskSearchResponse>("/tasks/list", compact({ ...input }));
  },
};

export default taskList;
