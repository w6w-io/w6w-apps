import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, questionIdParam } from "../lib/params.ts";

/**
 * `PATCH /questions/{question_id}` — like Update Form, the vendor documents
 * several different bodies against this one path/verb ("Update question
 * media", "Edit notes / script", "Add titles to videoask steps", plain field
 * updates) because a question's settings live in one flat/`metadata`-nested
 * PATCH body rather than sub-resources. `mediaUrl`/`mediaType`/`thumbnailUrl`
 * are typed because they are the fields every "update media" example shares;
 * `body` (JSON) covers everything else, e.g.
 * `{"metadata": {"text": "…"}}` for the question's on-screen text/script.
 */
interface Input {
  questionId: string;
  mediaUrl?: string;
  mediaType?: "video" | "audio";
  thumbnailUrl?: string;
  body?: unknown;
  organizationId?: string;
}

const questionUpdate: ActionDefinition<Input> = {
  key: "question-update",
  type: "perform",
  resource: "question",
  title: "Update Question",
  description:
    "Partially update a question. Common media fields are typed; use Body (JSON) for anything " +
    'else, e.g. {"metadata": {"text": "…"}} for the on-screen script.',
  idempotent: true,
  params: [
    questionIdParam,
    { key: "mediaUrl", label: "Media URL", type: "string" },
    {
      key: "mediaType",
      label: "Media type",
      type: "select",
      options: [
        { value: "video", label: "Video" },
        { value: "audio", label: "Audio" },
      ],
    },
    { key: "thumbnailUrl", label: "Thumbnail URL", type: "string" },
    { key: "body", label: "Body (JSON)", type: "json" },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The updated question" }],

  async execute(input, ctx) {
    const extra = input.body && typeof input.body === "object"
      ? input.body as Record<string, unknown>
      : {};
    const result = await new VideoAskClient(ctx).entity(
      `/questions/${encodeId(input.questionId)}`,
      {
        method: "PATCH",
        body: {
          ...extra,
          ...compact({
            media_url: input.mediaUrl,
            media_type: input.mediaType,
            thumbnail_url: input.thumbnailUrl,
          }),
        },
        organizationId: input.organizationId,
      },
    );
    return { result };
  },
};

export default questionUpdate;
