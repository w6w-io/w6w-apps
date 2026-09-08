import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  NutshellClient,
  type NutshellEntity,
  parseJsonObject,
  REV_PARAM,
  toId,
  VALUES_PARAM,
} from "../lib/client.ts";

interface Input {
  leadId: string | number;
  rev: string;
  description?: string;
  milestoneId?: string | number;
  confidence?: number;
  isPending?: boolean;
  note?: string;
  values?: unknown;
}

/**
 * `editLead(leadId, rev, lead)` — update a Lead, including closing/reopening it.
 *
 * Nutshell's own docs describe closing a Lead as setting a `lead.outcome`
 * object (an id from `findLead_Outcomes()`) rather than a plain status flag,
 * and reopening it as `{"status": 0}`. That is intentionally left to
 * Additional fields rather than a dedicated param here: which outcomes exist
 * (Won/Lost/Cancelled, and any company-specific ones configured under those
 * types) is per-instance configuration Find Lead Outcomes discovers, not
 * something this manifest can enumerate.
 *
 * Any relationship field NOT included here (contacts, accounts, products,
 * competitors, sources, tags) is left untouched if omitted — but Nutshell's
 * docs are explicit that supplying ANY value for one of those fields
 * REPLACES the full list, not appends to it. Use Additional fields with the
 * complete list (existing + new) when adding to one of those.
 */
const updateLead: ActionDefinition<Input, NutshellEntity> = {
  key: "update-lead",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Edit a Lead: description, stage, confidence, pending flag, or an appended note. " +
    "Requires the Rev from your last read of this Lead.",
  // Not idempotent: retrying with the same (leadId, rev, lead) after a successful call fails with
  // a 409 "rev key is out-of-date" rather than harmlessly no-op'ing, because the rev the retry
  // carries is now stale. Safe from data corruption, but not safe to blindly re-execute.
  idempotent: false,
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true },
    { ...REV_PARAM },
    { key: "description", label: "Description", type: "text" },
    {
      key: "milestoneId",
      label: "Milestone (stage) ID",
      type: "string",
      hint: "Moves the Lead to this pipeline stage. See Find Milestones.",
    },
    {
      key: "confidence",
      label: "Confidence %",
      type: "number",
      validation: { min: 0, max: 100 },
    },
    {
      key: "isPending",
      label: "Pending",
      type: "boolean",
      hint: "Marks the Lead as pending, per Nutshell's isPending flag.",
    },
    {
      key: "note",
      label: "Add note",
      type: "text",
      hint: "Appended to the Lead's existing notes. Notes cannot be removed via the API.",
    },
    { ...VALUES_PARAM },
  ],
  output: [
    { key: "id", type: "number", label: "Lead ID" },
    { key: "rev", type: "string", label: "New rev" },
  ],

  execute(input, ctx) {
    const lead = {
      ...compact({
        description: input.description,
        milestoneId: input.milestoneId,
        confidence: input.confidence,
        isPending: input.isPending,
        note: input.note,
      }),
      ...parseJsonObject(input.values, "Additional fields"),
    };

    return new NutshellClient(ctx).call<NutshellEntity>("editLead", {
      leadId: toId(input.leadId),
      rev: input.rev,
      lead,
    });
  },
};

export default updateLead;
