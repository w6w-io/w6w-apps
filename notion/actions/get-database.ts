import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  databaseId: string;
}

/**
 * Notion database ids in the UI URL are dash-less 32-char strings. The API
 * accepts them either way, so we forward whatever the user pastes — the client
 * doesn't need to reformat.
 */
const getDatabase: ActionDefinition<Input> = {
  key: "get-database",
  type: "read",
  resource: "database",
  title: "Get Database",
  description: "Retrieve a single database by ID.",
  params: [
    { key: "databaseId", label: "Database ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/databases/${input.databaseId}`);
  },
};

export default getDatabase;
