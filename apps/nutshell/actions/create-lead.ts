import type { ActionDefinition } from "@w6w/types";
import { compact, NutshellClient, type NutshellEntity, parseJsonObject } from "../lib/client.ts";

interface Input {
  primaryAccountId?: string | number;
  description?: string;
  milestoneId?: string | number;
  contactIds?: string;
  accountIds?: string;
  tags?: string;
  priority?: number;
  values?: unknown;
}

/**
 * `newLead(lead)` — create a Lead.
 *
 * All fields are optional per Nutshell's own docs: "it is possible to create
 * a nameless lead with no useful information" — the default sales process
 * attaches automatically. `priority: 1` marks a Lead "hot" (default `0`).
 * `milestoneId` sets the pipeline stage (`Core::findMilestones` lists valid
 * ids) and is Nutshell's own API term for what the product UI calls a
 * "stage".
 *
 * `idempotent: false`: this endpoint mints a new Lead on every call and
 * documents no dedupe key, so a retried call creates a second Lead.
 */
const createLead: ActionDefinition<Input, NutshellEntity> = {
  key: "create-lead",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a new Lead. Every field is optional — an empty Lead still gets the " +
    "default sales process attached.",
  idempotent: false,
  params: [
    {
      key: "primaryAccountId",
      label: "Primary account ID",
      type: "string",
      hint: "The Account (company) this Lead is primarily associated with.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "milestoneId",
      label: "Milestone (stage) ID",
      type: "string",
      hint: "Which stage of the pipeline to create this Lead in. See Find Milestones.",
    },
    {
      key: "contactIds",
      label: "Contact IDs",
      type: "string",
      hint: "Comma-separated Contact IDs to associate with this Lead.",
    },
    {
      key: "accountIds",
      label: "Account IDs",
      type: "string",
      hint: "Comma-separated Account IDs to associate with this Lead (in addition to the " +
        "primary account).",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag names. Tags must already exist in Nutshell.",
    },
    {
      key: "priority",
      label: "Hot lead",
      type: "boolean",
      hint: 'Sets priority to 1 ("hot"). Default is 0.',
    },
    {
      key: "values",
      label: "Additional fields",
      type: "json",
      hint: "JSON object merged into the lead payload, e.g. custom fields or " +
        "products/competitors/sources per the newLead reference.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New Lead ID" },
    { key: "rev", type: "string", label: "Rev (needed to later update this Lead)" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    const idList = (raw: string | undefined) =>
      (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean).map((id) => ({ id }));

    const lead = {
      ...compact({
        description: input.description,
        priority: input.priority ? 1 : undefined,
      }),
      ...(input.primaryAccountId ? { primaryAccount: { id: input.primaryAccountId } } : {}),
      ...(input.milestoneId ? { milestoneId: input.milestoneId } : {}),
      ...(input.contactIds ? { contacts: idList(input.contactIds) } : {}),
      ...(input.accountIds ? { accounts: idList(input.accountIds) } : {}),
      ...(input.tags ? { tags: input.tags.split(",").map((t) => t.trim()).filter(Boolean) } : {}),
      ...parseJsonObject(input.values, "Additional fields"),
    };

    return new NutshellClient(ctx).call<NutshellEntity>("newLead", { lead });
  },
};

export default createLead;
