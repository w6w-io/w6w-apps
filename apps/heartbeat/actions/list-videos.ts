import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/videos` — every native Heartbeat video in the community. */
const listVideos: ActionDefinition<Record<string, never>> = {
  key: "list-videos",
  type: "read",
  resource: "video",
  title: "List Videos",
  description: "Return every native Heartbeat video in the community.",
  params: [],
  output: [
    {
      key: "videos",
      type: "array",
      label: "Videos — [{id, name, createdAt, aspectRatio, duration, views}]",
    },
  ],

  async execute(_input, ctx) {
    const videos = await new HeartbeatClient(ctx).json("/videos");
    return { videos };
  },
};

export default listVideos;
