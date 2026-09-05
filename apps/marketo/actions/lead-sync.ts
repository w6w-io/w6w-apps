import type { ActionDefinition } from "@w6w/types";
import { compact, MarketoClient, type MarketoRecordResult } from "../lib/client.ts";

/**
 * `POST /rest/v1/leads.json` — verified against `leads.md` ("Create and
 * Update"). Create and update share this one endpoint; `action` picks the
 * mode (`createOrUpdate` default, `createOnly`, `updateOnly`,
 * `createDuplicate`) and `lookupField` picks the dedupe key (`email`
 * default). `id` is a system-managed key and should only be sent with
 * `updateOnly`.
 *
 * Marketo's own docs warn that concurrent or closely-timed upsert requests
 * using the same key can create duplicate records before the first request
 * returns — so this is marked non-idempotent even though a single
 * request-at-a-time `createOrUpdate` is normally safe to retry.
 *
 * Updating Company fields through this endpoint is explicitly unsupported —
 * use `company-sync` instead.
 */
const action: ActionDefinition = {
  key: "lead-sync",
  type: "perform",
  resource: "lead",
  title: "Create or update a lead",
  description: "Create a lead, update one, or either — Marketo dedupes by the lookup field.",
  idempotent: false,
  params: [
    {
      key: "action",
      label: "Action",
      type: "select",
      default: "createOrUpdate",
      options: [
        { value: "createOrUpdate", label: "Create or Update" },
        { value: "createOnly", label: "Create Only" },
        { value: "updateOnly", label: "Update Only" },
        { value: "createDuplicate", label: "Create Duplicate" },
      ],
    },
    {
      key: "lookupField",
      label: "Lookup Field",
      type: "string",
      default: "email",
      hint: "Used to find the existing record for createOrUpdate/updateOnly.",
    },
    { key: "id", label: "Lead ID", type: "number", hint: "Only for Update Only." },
    { key: "email", label: "Email", type: "string" },
    { key: "firstName", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    {
      key: "otherFields",
      label: "Other Fields (JSON)",
      type: "json",
      hint: 'Any other lead field, e.g. {"company": "Acme", "externalCompanyId": "123"}.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    let other: Record<string, unknown> = {};
    if (p.otherFields) {
      try {
        other = typeof p.otherFields === "string"
          ? JSON.parse(p.otherFields)
          : p.otherFields as Record<string, unknown>;
      } catch {
        throw new Error("`otherFields` must be valid JSON");
      }
    }

    const record = compact({
      id: p.id,
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      ...other,
    });
    if (Object.keys(record).length === 0) throw new Error("at least one lead field is required");

    ctx.log("info", "syncing a Marketo lead", { action: p.action ?? "createOrUpdate" });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>("/leads.json", {
      method: "POST",
      body: {
        action: p.action ?? "createOrUpdate",
        lookupField: p.lookupField || "email",
        input: [record],
      },
    });
    return res.result?.[0] ?? null;
  },
};

export default action;
