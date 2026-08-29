import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";
import { parseJsonObject } from "../lib/params.ts";

/**
 * `PUT /sequences/{id}` — update a sequence's settings and/or steps.
 *
 * Unlike most update endpoints in this API, the response is NOT wrapped under a
 * resource key — it is the sequence's own fields at the top level, alongside a
 * duplicated `emailer_campaign` object. This action returns the response as-is.
 */
interface Input {
  id: string;
  name?: string;
  active?: boolean;
  emailer_schedule_id?: string;
  label_names?: string[] | string;
  cc_emails?: string;
  bcc_emails?: string;
  emailer_steps?: unknown;
  settings?: unknown;
}

function toArr(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const sequenceUpdate: ActionDefinition<Input> = {
  key: "sequence-update",
  type: "perform",
  resource: "sequence",
  title: "Update Sequence",
  description: "Update a sequence's settings and/or steps.",
  // Setting the same absolute values again converges to the same end state.
  idempotent: true,
  params: [
    { key: "id", label: "Sequence", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "active",
      label: "Active",
      type: "boolean",
      hint: "true resumes scheduling steps; false pauses the sequence.",
    },
    { key: "emailer_schedule_id", label: "Sending schedule", type: "string" },
    { key: "label_names", label: "Folders (replaces existing)", type: "string", advanced: true },
    {
      key: "cc_emails",
      label: "CC emails",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
    {
      key: "bcc_emails",
      label: "BCC emails",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
    {
      key: "emailer_steps",
      label: "Steps",
      type: "json",
      advanced: true,
      hint: "Include an existing step's `id` to update it, omit it to add a new step.",
    },
    {
      key: "settings",
      label: "Additional settings",
      type: "json",
      advanced: true,
      hint: 'Any other documented field, e.g. `{"max_emails_per_day": 50}`.',
    },
  ],
  output: [{ key: "sequence", type: "object", label: "The updated sequence" }],

  async execute(input, ctx) {
    const sequence = await new ApolloClient(ctx).put(`/sequences/${encodeId(input.id)}`, {
      body: {
        ...compact({
          name: input.name,
          active: input.active,
          emailer_schedule_id: input.emailer_schedule_id,
          label_names: toArr(input.label_names),
          cc_emails: input.cc_emails,
          bcc_emails: input.bcc_emails,
          emailer_steps: input.emailer_steps,
        }),
        ...parseJsonObject(input.settings, "Additional settings"),
      },
    });
    return { sequence };
  },
};

export default sequenceUpdate;
