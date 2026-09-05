import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `DELETE /v0/channels/{channelID}` — delete a channel. */
interface Input {
  channelID: string;
}

const deleteChannel: ActionDefinition<Input> = {
  key: "delete-channel",
  type: "perform",
  resource: "channel",
  title: "Delete Channel",
  description: "Delete a channel.",
  idempotent: true,
  params: [{ key: "channelID", label: "Channel ID", type: "string", required: true }],
  output: [],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(`/channels/${encodeURIComponent(input.channelID)}`, {
      method: "DELETE",
    });
  },
};

export default deleteChannel;
