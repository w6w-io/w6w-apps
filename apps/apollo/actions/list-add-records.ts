import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { listModalityOptions } from "../lib/params.ts";

/**
 * `POST /labels/add_entity_ids_to_label_names` — add contacts or accounts to one or more
 * lists by name, creating any list name that doesn't already exist.
 */
interface Input {
  entity_ids: string[] | string;
  label_names: string[] | string;
  modality: "contacts" | "accounts";
  async?: boolean;
}

function toArr(v: string[] | string): string[] {
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const listAddRecords: ActionDefinition<Input> = {
  key: "list-add-records",
  type: "perform",
  resource: "list",
  title: "Add Records to List",
  description: "Add contacts or accounts to one or more lists, creating any list name that " +
    "doesn't already exist.",
  // Adding an already-listed record again is a no-op on the resulting membership.
  idempotent: true,
  params: [
    {
      key: "entity_ids",
      label: "Records to add",
      type: "string",
      required: true,
      hint: "Comma-separated Apollo IDs (contacts or accounts, matching Record type below).",
    },
    {
      key: "label_names",
      label: "Lists",
      type: "string",
      required: true,
      hint: "Comma-separated list names.",
    },
    {
      key: "modality",
      label: "Record type",
      type: "select",
      required: true,
      options: listModalityOptions,
    },
    {
      key: "async",
      label: "Process asynchronously",
      type: "boolean",
      advanced: true,
      hint: "Off by default: the call waits for the update to finish.",
    },
  ],
  output: [{ key: "lists", type: "array", label: "The affected lists" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ labels?: unknown[] }>(
      "/labels/add_entity_ids_to_label_names",
      {
        body: compact({
          entity_ids: toArr(input.entity_ids),
          label_names: toArr(input.label_names),
          modality: input.modality,
          async: input.async,
        }),
      },
    );
    return { lists: body.labels ?? [] };
  },
};

export default listAddRecords;
