import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  pageId: string;
  properties?: Record<string, unknown>;
  archived?: boolean;
  icon?: unknown;
  cover?: unknown;
}

/**
 * Notion's page update is a PATCH — omitted fields stay as-is, so callers
 * only send the diff.
 */
const updateDatabasePage: ActionDefinition<Input> = {
  key: "update-database-page",
  type: "perform",
  resource: "databasePage",
  title: "Update Database Page",
  description: "Update a database page's properties, icon, cover, or archived flag.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    { key: "properties", label: "Properties", type: "json", hint: "Partial Notion property map — only the properties you want to change." },
    { key: "archived", label: "Archived", type: "boolean" },
    { key: "icon", label: "Icon", type: "json" },
    { key: "cover", label: "Cover", type: "json" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.properties) body.properties = input.properties;
    if (input.archived !== undefined) body.archived = input.archived;
    if (input.icon !== undefined) body.icon = input.icon;
    if (input.cover !== undefined) body.cover = input.cover;
    return client.request(`/pages/${input.pageId}`, { method: "PATCH", body });
  },
};

export default updateDatabasePage;
