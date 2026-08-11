import type { ActionDefinition } from "@w6w/types";
import { compact, KeapClient, V2 } from "../lib/client.ts";
import { asOptionalJson, reminderMinuteOptions, taskPriorityOptions } from "../lib/params.ts";

/**
 * `POST /rest/v2/tasks` — Create a Task.
 *
 * ## The only required property is the assignee
 *
 * Not the title. `CreateTaskRequest.required` is exactly
 * `["assigned_to_user_id"]`, so Keap will happily create an untitled task and
 * refuse a fully-described one that names nobody. Use List Users to get an id.
 *
 * ## `remind_time_mins` is a closed set, and the schema mistypes it
 *
 * Keap declares it `type: integer` with a **string** enum —
 * `["5","10","15","30","60","120","240","480","1440","2880"]`. The declared
 * type and the `example: 30` agree that the value is a number, so numbers are
 * what this sends; the string enum is a defect in the document. Values outside
 * the set are rejected, so it is a select rather than a free number.
 *
 * ## `description` used to be called something else
 *
 * Keap notes on the response schema: "Legacy XML-RPC name for this field was
 * `CreationNotes`". Worth knowing if you are porting a script off the old API.
 */
interface Input {
  assignedToUserId: string;
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  dueTime?: string;
  remindTimeMins?: number;
  contactId?: string;
  opportunityId?: string;
  completed?: boolean;
  customFields?: unknown;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  title: "Create Task",
  resource: "task",
  description: "Create a task assigned to a Keap user, optionally linked to a contact.",
  // Keap mints a new task id per call with no dedupe key, so a retry is a
  // second task on somebody's list.
  idempotent: false,
  params: [
    {
      key: "assignedToUserId",
      label: "Assigned user ID",
      type: "string",
      required: true,
      hint: "The only property Keap requires. Use List Users to find an id.",
    },
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "type",
      label: "Type",
      type: "string",
      placeholder: "Call",
      hint: "Free-form label Keap groups tasks by, e.g. Call, Email, Follow up.",
    },
    { key: "priority", label: "Priority", type: "select", options: taskPriorityOptions },
    { key: "dueTime", label: "Due at", type: "datetime" },
    {
      key: "remindTimeMins",
      label: "Pop-up reminder",
      type: "select",
      options: reminderMinuteOptions,
      hint: "Keap accepts only these intervals; anything else is rejected.",
    },
    { key: "contactId", label: "Contact ID", type: "string", advanced: true },
    { key: "opportunityId", label: "Opportunity ID", type: "string", advanced: true },
    { key: "completed", label: "Create already completed", type: "boolean", advanced: true },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: 'Array of `{"id": "...", "content": ...}`. An empty array resets them all.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "due_time", type: "string", label: "Due at" },
    { key: "create_time", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    const body = compact({
      assigned_to_user_id: input.assignedToUserId,
      title: input.title,
      description: input.description,
      type: input.type,
      priority: input.priority,
      due_time: input.dueTime,
      // A number, not the string the enum in Keap's schema claims.
      remind_time_mins: input.remindTimeMins === undefined
        ? undefined
        : Number(input.remindTimeMins),
      contact_id: input.contactId,
      opportunity_id: input.opportunityId,
      completed: input.completed,
      custom_fields: asOptionalJson<unknown[]>(input.customFields, "Custom fields"),
    });
    const client = new KeapClient(ctx);
    return client.json(`${V2}/tasks`, { method: "POST", body });
  },
};

export default taskCreate;
