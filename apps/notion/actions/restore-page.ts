import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  pageId: string;
}

/**
 * Undoes archive-page: PATCH `archived=false`. Notion doesn't ship a
 * dedicated "restore" endpoint — same route, opposite flag.
 */
const restorePage: ActionDefinition<Input> = {
  key: "restore-page",
  type: "perform",
  resource: "page",
  title: "Restore Page",
  description: "Restore a previously archived page.",
  idempotent: true,
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/pages/${input.pageId}`, {
      method: "PATCH",
      body: { archived: false },
    });
  },
};

export default restorePage;
