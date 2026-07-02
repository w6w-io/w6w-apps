import type { ActionDefinition } from "@w6w/types";
import { ContentfulClient, resolveScope } from "../lib/client.ts";

interface Input {
  entryId: string;
  spaceId?: string;
  environmentId?: string;
}

/**
 * Contentful Management API — delete an entry. Contentful returns 204 on
 * success; we surface that as `{ ok: true }` for downstream flow steps.
 * The entry must be unpublished first (Contentful returns 400 otherwise).
 */
const deleteEntry: ActionDefinition<Input, { ok: true }> = {
  key: "delete-entry",
  type: "perform",
  resource: "entry",
  title: "Delete Entry",
  description: "Delete an entry via the Management API. The entry must be unpublished first.",
  idempotent: true,
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true },
    { key: "spaceId", label: "Space ID", type: "string" },
    { key: "environmentId", label: "Environment ID", type: "string" },
  ],

  async execute(input, ctx) {
    const { spaceId, environmentId } = resolveScope(input, ctx);
    const client = new ContentfulClient(ctx);
    await client.request(
      `/spaces/${spaceId}/environments/${environmentId}/entries/${input.entryId}`,
      { method: "DELETE", base: "management" },
    );
    return { ok: true };
  },
};

export default deleteEntry;
