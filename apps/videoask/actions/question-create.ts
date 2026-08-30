import type { ActionDefinition } from "@w6w/types";
import { compact, toList, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam } from "../lib/params.ts";

/**
 * `POST /questions` — add a step to a form, pointing at externally-hosted
 * media (a URL you already have, e.g. from Vimeo, Giphy, or your own CDN).
 *
 * The vendor documents THREE ways to create a question: external media (this
 * action), uploading raw bytes, and reusing existing VideoAsk media. The
 * upload path is a two-step, S3-presigned-POST flow (`POST /images` or a
 * `media_upload.presigned_post_params` field, then a raw multipart `POST` to
 * `videoask-uploads-prod.s3(-accelerate).amazonaws.com`) that this app
 * deliberately does not implement — see the README for why. This action only
 * covers the external-media form, which is the vendor's own first documented
 * example and needs no binary upload.
 *
 * Body fields are exactly that example: `form_id`, `media_type`, `media_url`,
 * `thumbnail_url`, `allowed_answer_media_types`.
 */
interface Input {
  formId: string;
  mediaType: "video" | "audio";
  mediaUrl: string;
  thumbnailUrl?: string;
  allowedAnswerMediaTypes?: string[];
  organizationId?: string;
}

const questionCreate: ActionDefinition<Input> = {
  key: "question-create",
  type: "perform",
  resource: "question",
  title: "Create Question (External Media)",
  description:
    "Add a step to a form using an externally-hosted video or audio URL. Direct file upload is " +
    "not supported by this app — host the media yourself first.",
  idempotent: false,
  params: [
    formIdParam,
    {
      key: "mediaType",
      label: "Media type",
      type: "select",
      required: true,
      options: [
        { value: "video", label: "Video" },
        { value: "audio", label: "Audio" },
      ],
    },
    { key: "mediaUrl", label: "Media URL", type: "string", required: true },
    { key: "thumbnailUrl", label: "Thumbnail URL", type: "string" },
    {
      key: "allowedAnswerMediaTypes",
      label: "Allowed answer media types",
      type: "multiselect",
      options: [
        { value: "video", label: "Video" },
        { value: "audio", label: "Audio" },
        { value: "text", label: "Text" },
      ],
      hint: "How the contact may answer this step.",
    },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The created question" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity("/questions", {
      method: "POST",
      body: compact({
        form_id: input.formId,
        media_type: input.mediaType,
        media_url: input.mediaUrl,
        thumbnail_url: input.thumbnailUrl,
        allowed_answer_media_types: toList(input.allowedAnswerMediaTypes),
      }),
      organizationId: input.organizationId,
    });
    return { result };
  },
};

export default questionCreate;
