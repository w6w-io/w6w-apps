import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient } from "../lib/client.ts";

/** `channels` takes no arguments. */
const QUERY = `
  query Channels {
    channels {
      id
      title
      is_private
      created_by
      created_at
      updated_at
      members { user_id email name }
    }
  }
`;

const channelList: ActionDefinition<Record<string, never>> = {
  key: "channel-list",
  type: "read",
  resource: "channel",
  title: "List Channels",
  description:
    "List the team's channels. The ids are what `meeting-channel-update` and the Channel ID filter on `transcript-search` expect.",
  params: [],
  output: [
    { key: "channels", type: "array", label: "Channels" },
  ],

  execute(_input, ctx) {
    return new FirefliesClient(ctx).query(QUERY);
  },
};

export default channelList;
