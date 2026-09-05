import type { ActionDefinition } from "@w6w/types";
import { compact, RespondioClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /space/channel/{channelId}/template` — `SpaceClient.listTemplates` in
 * the official SDK. WhatsApp message templates approved for one channel —
 * the source for `templateName`/`templateComponents` on `message-send`.
 */
interface Input {
  channelId: number;
  limit?: number;
  cursorId?: number;
}

const spaceChannelTemplateList: ActionDefinition<Input> = {
  key: "space-channel-template-list",
  type: "read",
  resource: "space",
  title: "List Channel Templates",
  description: "List the WhatsApp message templates approved for one channel.",
  params: [
    { key: "channelId", label: "Channel ID", type: "number", required: true },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Templates" },
    { key: "pagination", type: "object", label: "Pagination cursor" },
  ],

  execute(input, ctx) {
    if (!Number.isFinite(input.channelId)) throw new Error("Channel ID is required");
    return new RespondioClient(ctx).get(
      `/space/channel/${input.channelId}/template`,
      compact({ limit: input.limit, cursorId: input.cursorId }),
    );
  },
};

export default spaceChannelTemplateList;
