import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `DELETE /v0/channelCategories/{channelCategoryID}` — delete a channel category. */
interface Input {
  channelCategoryID: string;
}

const deleteChannelCategory: ActionDefinition<Input> = {
  key: "delete-channel-category",
  type: "perform",
  resource: "channel-category",
  title: "Delete Channel Category",
  description: "Delete a channel category.",
  idempotent: true,
  params: [{
    key: "channelCategoryID",
    label: "Channel Category ID",
    type: "string",
    required: true,
  }],
  output: [],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(
      `/channelCategories/${encodeURIComponent(input.channelCategoryID)}`,
      { method: "DELETE" },
    );
  },
};

export default deleteChannelCategory;
