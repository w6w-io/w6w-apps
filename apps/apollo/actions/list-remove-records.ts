import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { listModalityOptions } from "../lib/params.ts";

/** `POST /labels/remove_entity_ids_from_label_names` — remove contacts or accounts from lists. */
interface Input {
  entity_ids: string[] | string;
  label_names: string[] | string;
  modality: "contacts" | "accounts";
  async?: boolean;
}

function toArr(v: string[] | string): string[] {
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const listRemoveRecords: ActionDefinition<Input> = {
  key: "list-remove-records",
  type: "perform",
  resource: "list",
  title: "Remove Records from List",
  description: "Remove contacts or accounts from one or more lists.",
  // Removing an already-absent record again is a no-op on the resulting membership.
  idempotent: true,
  params: [
    {
      key: "entity_ids",
      label: "Records to remove",
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
      "/labels/remove_entity_ids_from_label_names",
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

export default listRemoveRecords;
