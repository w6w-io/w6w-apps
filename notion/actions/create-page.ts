import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  parentPageId: string;
  title: string;
  children?: unknown[];
  icon?: unknown;
  cover?: unknown;
}

/**
 * Creates a page under another page (not a database page — for that use
 * create-database-page). Notion requires the title be provided as the
 * conventional `title` property.
 */
const createPage: ActionDefinition<Input> = {
  key: "create-page",
  type: "perform",
  resource: "page",
  title: "Create Page",
  description: "Create a page as a child of another page.",
  params: [
    { key: "parentPageId", label: "Parent Page ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "children", label: "Children (blocks)", type: "json", hint: "Optional array of block objects as page content." },
    { key: "icon", label: "Icon", type: "json" },
    { key: "cover", label: "Cover", type: "json" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    const body: Record<string, unknown> = {
      parent: { page_id: input.parentPageId },
      properties: {
        title: [{ text: { content: input.title } }],
      },
    };
    if (input.children) body.children = input.children;
    if (input.icon) body.icon = input.icon;
    if (input.cover) body.cover = input.cover;
    return client.request("/pages", { method: "POST", body });
  },
};

export default createPage;
