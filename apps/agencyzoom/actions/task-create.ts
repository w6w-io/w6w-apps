import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, compact, type GenericSuccessResponse } from "../lib/client.ts";
import { taskTypeOptions } from "../lib/params.ts";

/**
 * `POST /v1/api/tasks` — create a task (to-do, email, call or meeting) linked
 * to a lead or a customer.
 *
 * `dueDatetime` is documented as `YYYY-MM-DD HH:mm:ss` (the vendor's own
 * example: `2020-12-12 00:00:00`) — yet another date shape distinct from every
 * other endpoint in this app. Provide either `leadId` or `customerId` (or
 * `contactEmail` to have AgencyZoom look one up); the API accepts a task with
 * none of the three, but it will then not show up against any record.
 */
interface Input {
  title?: string;
  dueDatetime?: string;
  comments?: string;
  assigneeId?: number;
  lifeProfessionalId?: number;
  contactEmail?: string;
  customerId?: number;
  leadId?: number;
  duration?: number;
  type?: "todo" | "email" | "call" | "meeting";
  invitees?: string;
  timeSpecific?: boolean;
}

/** `"a@b.com, c@d.com"` -> `["a@b.com", "c@d.com"]`. Blank entries dropped. */
function splitEmails(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const list = value.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task linked to a lead or a customer.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string" },
    {
      key: "dueDatetime",
      label: "Due date/time",
      type: "string",
      hint: "YYYY-MM-DD HH:mm:ss.",
    },
    { key: "comments", label: "Notes", type: "text" },
    { key: "assigneeId", label: "Assignee ID", type: "number", hint: "From List Employees." },
    { key: "lifeProfessionalId", label: "Life & Health Professional ID", type: "number" },
    {
      key: "contactEmail",
      label: "Contact email",
      type: "string",
      hint: "Used to find the matching lead or customer, if leadId/customerId aren't given.",
    },
    { key: "customerId", label: "Customer ID", type: "number" },
    { key: "leadId", label: "Lead ID", type: "number" },
    { key: "duration", label: "Duration (minutes)", type: "number" },
    { key: "type", label: "Task type", type: "select", options: taskTypeOptions },
    {
      key: "invitees",
      label: "Invitee emails",
      type: "string",
      hint: "Comma-separated list of email addresses to invite.",
    },
    {
      key: "timeSpecific",
      label: "Time-specific",
      type: "boolean",
      hint: "If true, the due time (not just the date) is meaningful.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New task ID" },
    { key: "message", type: "string", label: "Confirmation message" },
  ],

  execute(input, ctx) {
    const { invitees, ...rest } = input;
    return new AgencyZoomClient(ctx).post<GenericSuccessResponse>(
      "/tasks",
      compact({ ...rest, invitees: splitEmails(invitees) }),
    );
  },
};

export default taskCreate;
