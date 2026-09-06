import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `GET /v3/enterprise/collections` — list the enterprise team's folders.
 *
 * Verified against the "Get all team folders" reference page (fetched
 * 2026-09-06): `servers: ["https://api.feedly.com/v3"]`, path
 * `/enterprise/collections`. This is the one endpoint in the whole reference
 * with a proper OpenAPI 3.0 component schema (`Folder`, `Feed`) rather than a
 * bare inlined example, and it documents a real 401/403 pair
 * ("Unauthorized" / "Forbidden — Insufficient permissions to access team
 * folders").
 */

interface Input {
  includeArchived?: boolean;
}

const foldersList: ActionDefinition<Input> = {
  key: "folders-list",
  type: "read",
  resource: "folders",
  title: "List Folders",
  description: "List the enterprise team's folders, each with its member feeds.",
  params: [
    {
      key: "includeArchived",
      label: "Include archived folders",
      type: "boolean",
      default: false,
    },
  ],
  output: [{ key: "folders", type: "array", label: "Folders" }],

  async execute(input, ctx) {
    const folders = await new FeedlyClient(ctx).json<unknown[]>("/v3/enterprise/collections", {
      query: { includeArchived: input.includeArchived },
    });
    return { folders: folders ?? [] };
  },
};

export default foldersList;
