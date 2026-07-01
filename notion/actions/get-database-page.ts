import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  pageId: string;
}

/**
 * Notion has no distinct endpoint for database pages vs. regular pages —
 * both are GET /pages/:id. Kept as a separate action so the editor can group
 * it under the `databasePage` resource.
 */
const getDatabasePage: ActionDefinition<Input> = {
  key: "get-database-page",
  type: "read",
  resource: "databasePage",
  title: "Get Database Page",
  description: "Retrieve a single database page by ID.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/pages/${input.pageId}`);
  },
};

export default getDatabasePage;
