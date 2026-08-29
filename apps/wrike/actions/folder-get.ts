import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, joinIds, WrikeClient } from "../lib/client.ts";

/**
 * `GET /folders/{folderIds}` — complete information about one or more
 * folders/projects/spaces by ID. Up to 1000 comma-separated ids per call.
 */
interface Input {
  folderIds: string | string[];
  withInvitations?: boolean;
}

const folderGet: ActionDefinition<Input> = {
  key: "folder-get",
  type: "read",
  resource: "folder",
  title: "Get Folders by ID",
  description: "Fetch complete information about one or more folders/projects by ID.",
  params: [
    {
      key: "folderIds",
      label: "Folder ID(s)",
      type: "string",
      required: true,
      hint: "One folder ID, or several comma-separated (up to 1000).",
    },
    { key: "withInvitations", label: "Include invitations", type: "boolean", advanced: true },
  ],
  output: [{ key: "items", type: "array", label: "Folders / projects" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const items = await new WrikeClient(ctx, host).list(`/folders/${joinIds(input.folderIds)}`, {
      query: { withInvitations: input.withInvitations },
    });
    return { items };
  },
};

export default folderGet;
