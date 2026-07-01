import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  databaseId: string;
  properties: Record<string, unknown>;
  children?: unknown[];
  icon?: { type: "emoji"; emoji: string } | { type: "external"; external: { url: string } };
  cover?: { type: "external"; external: { url: string } };
}

/**
 * Notion's page-create semantics are unified: a page in a database is a page
 * with `parent.database_id` set. n8n's databasePageCreate builds the
 * properties dictionary from a UI form; we let callers pass the Notion
 * property object directly since anything richer requires a database schema
 * lookup we don't want to hide.
 */
const createDatabasePage: ActionDefinition<Input> = {
  key: "create-database-page",
  type: "perform",
  resource: "databasePage",
  title: "Create Database Page",
  description: "Create a page inside a database. Provide the `properties` map keyed by property name.",
  params: [
    { key: "databaseId", label: "Database ID", type: "string", required: true },
    { key: "properties", label: "Properties", type: "json", required: true, hint: "Notion property values, e.g. `{ \"Name\": { \"title\": [{ \"text\": { \"content\": \"Hello\" } }] } }`." },
    { key: "children", label: "Children (blocks)", type: "json", hint: "Optional array of block objects appended as page content." },
    { key: "icon", label: "Icon", type: "json" },
    { key: "cover", label: "Cover", type: "json" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    const body: Record<string, unknown> = {
      parent: { database_id: input.databaseId },
      properties: input.properties,
    };
    if (input.children) body.children = input.children;
    if (input.icon) body.icon = input.icon;
    if (input.cover) body.cover = input.cover;
    return client.request("/pages", { method: "POST", body });
  },
};

export default createDatabasePage;
