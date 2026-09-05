import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, compact, RespondioClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /contact/{identifier}/channels` — `ContactClient.listChannels` in the
 * official SDK. Every channel this specific contact has messaged through —
 * distinct from `space-channel-list`, which lists every channel the
 * workspace has connected.
 */
interface Input {
  identifier: string;
  limit?: number;
  cursorId?: number;
}

const contactListChannels: ActionDefinition<Input> = {
  key: "contact-list-channels",
  type: "read",
  resource: "contact",
  title: "List Contact Channels",
  description: "List the channels a specific contact has been reached through.",
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Channels" },
    { key: "pagination", type: "object", label: "Pagination cursor" },
  ],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    return new RespondioClient(ctx).get(
      `/contact/${identifier}/channels`,
      compact({ limit: input.limit, cursorId: input.cursorId }),
    );
  },
};

export default contactListChannels;
