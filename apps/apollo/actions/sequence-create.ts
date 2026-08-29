import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { parseJsonObject } from "../lib/params.ts";

/**
 * `POST /sequences` — create a new outreach sequence (emailer campaign).
 *
 * The vendor documents ~20 optional settings beyond the ones named here (send-window
 * behaviour, auto-pause/finish triggers, daily send caps, …) — `settings` merges any of
 * those straight into the request body, e.g.
 * `{"max_emails_per_day": 50, "mark_finished_if_reply": true}`.
 */
interface Input {
  name: string;
  active?: boolean;
  user_id?: string;
  emailer_schedule_id?: string;
  label_names?: string[] | string;
  emailer_steps?: unknown;
  settings?: unknown;
}

function toArr(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const sequenceCreate: ActionDefinition<Input> = {
  key: "sequence-create",
  type: "perform",
  resource: "sequence",
  title: "Create Sequence",
  description: "Create a new outreach sequence.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "active",
      label: "Active",
      type: "boolean",
      hint: "Starts scheduling steps immediately.",
    },
    {
      key: "user_id",
      label: "Owner (Apollo user ID)",
      type: "string",
      hint: "Defaults to the API key's own user. From `user-list`.",
    },
    {
      key: "emailer_schedule_id",
      label: "Sending schedule",
      type: "string",
      hint: "From `emailer-schedule-list`.",
    },
    { key: "label_names", label: "Folders", type: "string", hint: "Comma-separated." },
    {
      key: "emailer_steps",
      label: "Steps",
      type: "json",
      advanced: true,
      hint: "Ordered array of step objects — see the Create Sequence reference for the shape.",
    },
    {
      key: "settings",
      label: "Additional settings",
      type: "json",
      advanced: true,
      hint: 'Any other documented field, e.g. `{"max_emails_per_day": 50, ' +
        '"mark_finished_if_reply": true}`.',
    },
  ],
  output: [{ key: "sequence", type: "object", label: "The created sequence" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ emailer_campaign?: unknown }>("/sequences", {
      body: {
        ...compact({
          name: input.name,
          active: input.active,
          user_id: input.user_id,
          emailer_schedule_id: input.emailer_schedule_id,
          label_names: toArr(input.label_names),
          emailer_steps: input.emailer_steps,
        }),
        ...parseJsonObject(input.settings, "Additional settings"),
      },
    });
    return { sequence: body.emailer_campaign ?? null };
  },
};

export default sequenceCreate;
