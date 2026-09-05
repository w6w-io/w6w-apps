import type { ActionDefinition } from "@w6w/types";
import { GraphClient, pagePath } from "../lib/client.ts";
import { locationParams, pageIdParam } from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  pageId: string;
}

interface Output {
  status: number;
}

/**
 * `DELETE /me/onenote/pages/{id}` (and the `users`/`groups`/`sites` equivalents)
 *
 * https://learn.microsoft.com/en-us/graph/api/page-delete
 *
 * Least privileged delegated permission: `Notes.ReadWrite` — this endpoint's
 * table lists no `Notes.Create` alternative at all, the same as Update Page
 * Content (see `auth/oauth2.ts`). Returns `204 No Content`. Supported for
 * both work-or-school and personal Microsoft accounts.
 */
const deletePage: ActionDefinition<Input, Output> = {
  key: "delete-page",
  type: "perform",
  resource: "page",
  title: "Delete Page",
  description: "Delete a OneNote page.",
  // Deleting an already-deleted page answers 404, but the end state — gone —
  // is the same either way; this App treats the intent as idempotent, the
  // same reasoning the sibling `sharepoint` App's `delete-item` documents.
  idempotent: true,
  params: [...locationParams(), pageIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx): Promise<Output> {
    const client = new GraphClient(ctx);
    return await client.status(pagePath(input, input.pageId), { method: "DELETE" });
  },
};

export default deletePage;
