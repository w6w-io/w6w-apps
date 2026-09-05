import type { ActionDefinition } from "@w6w/types";
import { compact, RespondioClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /space/channel` — `SpaceClient.listChannels` in the official SDK.
 * Every channel connected to the workspace — distinct from
 * `contact-list-channels`, which is scoped to one contact.
 */
interface Input {
  limit?: number;
  cursorId?: number;
}

const spaceChannelList: ActionDefinition<Input> = {
  key: "space-channel-list",
  type: "read",
  resource: "space",
  title: "List Workspace Channels",
  description: "List every channel connected to this workspace.",
  params: [...paginationParams()],
  output: [
    { key: "items", type: "array", label: "Channels" },
    { key: "pagination", type: "object", label: "Pagination cursor" },
  ],

  execute(input, ctx) {
    return new RespondioClient(ctx).get(
      "/space/channel",
      compact({ limit: input.limit, cursorId: input.cursorId }),
    );
  },
};

export default spaceChannelList;
