import type { ActionDefinition } from "@w6w/types";
import { ContentfulClient, resolveScope } from "../lib/client.ts";

interface Input {
  entryId: string;
  fields: Record<string, unknown>;
  version: number;
  spaceId?: string;
  environmentId?: string;
}

/**
 * Contentful Management API — update an entry. The Management API uses
 * optimistic concurrency: you MUST pass the entry's current `sys.version` via
 * the `X-Contentful-Version` header, and every request bumps it.
 */
const updateEntry: ActionDefinition<Input> = {
  key: "update-entry",
  type: "perform",
  resource: "entry",
  title: "Update Entry",
  description:
    "Replace an entry's fields via the Management API. Requires the current version for optimistic locking.",
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: "Full locale-keyed field map. Values not included will be cleared.",
    },
    {
      key: "version",
      label: "Version",
      type: "number",
      required: true,
      hint: "The entry's current `sys.version` — pass through from a Get Entry.",
    },
    { key: "spaceId", label: "Space ID", type: "string" },
    { key: "environmentId", label: "Environment ID", type: "string" },
  ],

  async execute(input, ctx) {
    const { spaceId, environmentId } = resolveScope(input, ctx);
    const client = new ContentfulClient(ctx);
    return client.request(
      `/spaces/${spaceId}/environments/${environmentId}/entries/${input.entryId}`,
      {
        method: "PUT",
        base: "management",
        headers: { "X-Contentful-Version": String(input.version) },
        body: { fields: input.fields },
      },
    );
  },
};

export default updateEntry;
