import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, encodeSegment, flag, PodioClient, toList } from "../lib/client.ts";
import { writeSwitchParams } from "../lib/params.ts";

/**
 * `POST /task/` and `POST /task/{ref_type}/{ref_id}/` — "Creates a new task",
 * with or without a reference.
 *
 * Podio publishes these as two operations; they take the identical body and
 * differ only in whether the new task points at something. This action is one
 * action because from a workflow's side it is one decision — filling in the
 * reference or not — and two adjacent actions differing by a path segment is
 * how a user picks the wrong one.
 *
 * The vendor documents the valid reference types for the second form exactly:
 * "item", "status", "app", "space" and "conversation".
 *
 * ## `responsible` accepts five different shapes
 *
 * Podio: "The contact(s) responsible for the task, identified by either: An
 * integer (user_id); A `{"type": …, "id": …}` object; A list of integers and/or
 * contact identifier objects", over five identifier types — `user`, `profile`,
 * `mail`, `space`, `external`. The `mail` type is the useful one and the one
 * nobody finds: it assigns by email address, so a workflow does not have to
 * resolve a Podio user id first. This is a `json` param because no single
 * scalar control can express that union honestly.
 *
 * ## Not idempotent
 *
 * No idempotency key, no deduplication on `external_id`. A retry creates a
 * second task.
 */
interface Input {
  text: string;
  description?: string;
  responsible?: unknown;
  dueDate?: string;
  dueOn?: string;
  private?: boolean;
  labels?: string[] | string;
  externalId?: string;
  refType?: string;
  refId?: string;
  hook?: boolean;
  silent?: boolean;
}

const REF_TYPES = ["item", "status", "app", "space", "conversation"];

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a Podio task, optionally attached to an item or other object. Responsible " +
    "parties can be given by user id or by email address.",
  idempotent: false,
  params: [
    {
      key: "text",
      label: "Task",
      type: "string",
      required: true,
      hint: "The task's one-line text.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "responsible",
      label: "Responsible",
      type: "json",
      placeholder: '[{"type": "mail", "id": "someone@example.com"}]',
      hint: 'A user id, a {"type", "id"} object, or a list of either. Identifier types ' +
        "are user, profile, mail, space and external — “mail” assigns by email address " +
        "without needing to look up a Podio user id first.",
    },
    {
      key: "dueDate",
      label: "Due date",
      type: "date",
      hint: "Local date, YYYY-MM-DD. Use Due on instead when the time matters.",
    },
    {
      key: "dueOn",
      label: "Due on (UTC)",
      type: "datetime",
      advanced: true,
      hint: "Date and time in UTC. Podio treats this as authoritative over the local " +
        "due date.",
    },
    {
      key: "private",
      label: "Private",
      type: "boolean",
      hint: "A private task is excluded from workspace search results even for people who " +
        "could otherwise open it.",
    },
    { key: "labels", label: "Labels", type: "multiselect", advanced: true },
    { key: "externalId", label: "External ID", type: "string", advanced: true },
    {
      key: "refType",
      label: "Attach to (type)",
      type: "select",
      options: REF_TYPES.map((v) => ({ value: v, label: v })),
      validation: { enum: REF_TYPES },
      hint: "Leave both reference fields empty for a standalone task.",
    },
    {
      key: "refId",
      label: "Attach to (id)",
      type: "string",
      dependsOn: ["refType"],
      hint: "Numeric id of the object named above.",
    },
    ...writeSwitchParams(),
  ],
  output: [{ key: "task", type: "object", label: "The created task" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = { text: input.text };
    if (input.description) body.description = input.description;
    const responsible = asOptionalJson<unknown>(input.responsible, "Responsible");
    if (responsible !== undefined) body.responsible = responsible;
    if (input.dueDate) body.due_date = input.dueDate;
    if (input.dueOn) body.due_on = input.dueOn;
    if (input.private !== undefined) body.private = input.private;
    const labels = toList(input.labels);
    if (labels) body.labels = labels;
    if (input.externalId) body.external_id = input.externalId;

    const hasRef = Boolean(input.refType && input.refId);
    if (Boolean(input.refType) !== Boolean(input.refId)) {
      throw new Error("Attach to (type) and Attach to (id) must be given together, or not at all");
    }
    const path = hasRef
      ? `/task/${encodeSegment(input.refType!)}/${encodeSegment(input.refId!)}/`
      : "/task/";

    const task = await new PodioClient(ctx).json<Record<string, unknown>>(path, {
      method: "POST",
      body,
      query: { hook: flag(input.hook), silent: flag(input.silent) },
    });
    return { task: task ?? {} };
  },
};

export default taskCreate;
