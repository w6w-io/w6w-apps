import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  pageId: string;
}

/**
 * "Archive" in Notion is a soft-delete: PATCH the page with archived=true.
 * The page can be restored later with restore-page.
 */
const archivePage: ActionDefinition<Input> = {
  key: "archive-page",
  type: "perform",
  resource: "page",
  title: "Archive Page",
  description: "Archive (soft-delete) a page. Reversible with restore-page.",
  idempotent: true,
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/pages/${input.pageId}`, {
      method: "PATCH",
      body: { archived: true },
    });
  },
};

export default archivePage;
