import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, CannyClient, toList } from "../lib/client.ts";
import { messageOutput } from "../lib/output.ts";
import { postIdParam } from "../lib/params.ts";

/** `POST /v1/posts/update` — update a post's own fields (not its status/category/board/tags). */
interface Input {
  postID: string;
  title?: string;
  details?: string;
  customFields?: unknown;
  eta?: string;
  etaPublic?: boolean;
  imageURLs?: string[] | string;
}

const postUpdate: ActionDefinition<Input> = {
  key: "post-update",
  type: "perform",
  resource: "post",
  title: "Update Post",
  description: "Update a post's title, details, ETA, custom fields, or images.",
  idempotent: true,
  params: [
    postIdParam,
    { key: "title", label: "Title", type: "string" },
    { key: "details", label: "Details", type: "text" },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
    },
    { key: "eta", label: "ETA", type: "string", advanced: true, placeholder: "06/2022" },
    { key: "etaPublic", label: "ETA is public", type: "boolean", advanced: true },
    { key: "imageURLs", label: "Image URLs", type: "string", repeat: true, advanced: true },
  ],
  output: messageOutput,

  async execute(input, ctx) {
    const message = await new CannyClient(ctx).postMessage("/posts/update", {
      postID: input.postID,
      title: input.title,
      details: input.details,
      customFields: asOptionalJson(input.customFields, "customFields"),
      eta: input.eta,
      etaPublic: input.etaPublic,
      imageURLs: toList(input.imageURLs),
    });
    return { message };
  },
};

export default postUpdate;
