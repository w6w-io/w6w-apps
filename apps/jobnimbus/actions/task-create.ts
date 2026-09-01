import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, JobNimbusClient } from "../lib/client.ts";
import { ACTOR_PARAM } from "../lib/params.ts";

interface Input {
  title: string;
  related_jnid?: string;
  date_start?: number;
  date_end?: number;
  record_type_name?: string;
  extra?: unknown;
  actor?: string;
}

/**
 * `POST /tasks`.
 *
 * JobNimbus's example links a task to a contact or job via
 * `"related": [{"id": "<jnid>"}]`; this action exposes that as a single
 * `related_jnid` string, since one related record is the common case. Pass
 * `related` inside `extra` to attach more than one. `date_start`/`date_end`
 * are Unix timestamps (seconds), matching JobNimbus's own example
 * (`1460131200`).
 */
const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a new JobNimbus task (a to-do or appointment).",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "related_jnid",
      label: "Related contact/job jnid",
      type: "string",
      hint: "Links this task to a contact or job, e.g. from Contact List or Job List.",
    },
    {
      key: "record_type_name",
      label: "Record type",
      type: "string",
      hint: 'A task type defined in this account\'s settings, e.g. "Appointment" or "Task".',
    },
    {
      key: "date_start",
      label: "Start (Unix timestamp)",
      type: "number",
      hint: "Seconds since the Unix epoch.",
    },
    {
      key: "date_end",
      label: "End (Unix timestamp)",
      type: "number",
      advanced: true,
      hint: "Seconds since the Unix epoch.",
    },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Any other JobNimbus task fields (e.g. multiple `related` entries), merged into " +
        "the request body verbatim. Overrides the fields above on key collision.",
    },
    ACTOR_PARAM,
  ],
  output: [
    { key: "jnid", type: "string", label: "jnid" },
    { key: "title", type: "string", label: "Title" },
    { key: "date_created", type: "number", label: "Created (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    const { actor, extra, related_jnid, ...fields } = input;
    const body = {
      ...compact(fields as Record<string, unknown>),
      ...(related_jnid ? { related: [{ id: related_jnid }] } : {}),
      ...(asOptionalJson<Record<string, unknown>>(extra, "extra") ?? {}),
    };
    return await new JobNimbusClient(ctx).single("/tasks", {
      method: "POST",
      body,
      query: { actor },
    });
  },
};

export default taskCreate;
