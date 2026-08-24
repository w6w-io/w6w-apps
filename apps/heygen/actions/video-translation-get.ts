import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

interface Input {
  videoTranslationId: string;
}

/** `GET /v3/video-translations/{video_translation_id}` — status is `pending`/`running`/`completed`/`failed`. */
const videoTranslationGet: ActionDefinition<Input> = {
  key: "video-translation-get",
  type: "read",
  resource: "video-translation",
  title: "Get Video Translation",
  description: "Fetch a video translation job's status and, once completed, its output URLs.",
  params: [
    { key: "videoTranslationId", label: "Video translation ID", type: "string", required: true },
  ],
  output: [{ key: "data", type: "object", label: "The video translation" }],

  execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    return client.data(
      `/v3/video-translations/${encodeURIComponent(input.videoTranslationId)}`,
    );
  },
};

export default videoTranslationGet;
