import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  pageId: string;
  force?: boolean;
}

const pageDelete: ActionDefinition<Input> = {
  key: "page-delete",
  type: "perform",
  resource: "page",
  title: "Delete Page",
  description: "Move a page to trash, or bypass trash entirely with `force`.",
  idempotent: true,
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      default: false,
      hint: "Bypass trash and delete permanently.",
    },
  ],

  async execute(input, ctx) {
    const client = WordPressClient.fromConnection(ctx);
    return client.request(`/pages/${input.pageId}`, {
      method: "DELETE",
      query: { force: input.force },
    });
  },
};

export default pageDelete;
