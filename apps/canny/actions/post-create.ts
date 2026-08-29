import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, CannyClient, toList } from "../lib/client.ts";
import { idOutput } from "../lib/output.ts";
import { boardIdParam } from "../lib/params.ts";

/**
 * `POST /v1/posts/create` — create a new post on behalf of a user.
 *
 * Canny's own reference notes the author must already exist as a Canny user
 * — use the "Upsert User" action first (`users/create_or_update`) to create
 * or resolve one and get its id.
 */
interface Input {
  authorID: string;
  boardID: string;
  title: string;
  details: string;
  byID?: string;
  categoryID?: string;
  customFields?: unknown;
  eta?: string;
  etaPublic?: boolean;
  ownerID?: string;
  imageURLs?: string[] | string;
  createdAt?: string;
}

const postCreate: ActionDefinition<Input> = {
  key: "post-create",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description:
    "Create a new post. The author must already exist as a Canny user — see Upsert User.",
  idempotent: false,
  params: [
    {
      key: "authorID",
      label: "Author",
      type: "string",
      required: true,
      hint: "The post author's Canny user id.",
    },
    boardIdParam(true),
    { key: "title", label: "Title", type: "string", required: true },
    { key: "details", label: "Details", type: "text", required: true },
    {
      key: "byID",
      label: "Created by (admin)",
      type: "string",
      advanced: true,
      hint: "The admin creating this post on the author's behalf. Visible in the post.",
    },
    {
      key: "categoryID",
      label: "Category",
      type: "string",
      hint: "The post's category or subcategory id.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: "Field names must be 0-30 characters; string values under 200 characters.",
    },
    {
      key: "eta",
      label: "ETA",
      type: "string",
      advanced: true,
      placeholder: "06/2022",
      hint: "Estimated completion date, in MM/YYYY format.",
    },
    { key: "etaPublic", label: "ETA is public", type: "boolean", advanced: true },
    {
      key: "ownerID",
      label: "Owner",
      type: "string",
      advanced: true,
      hint: "The user id responsible for completing the work described in the post.",
    },
    { key: "imageURLs", label: "Image URLs", type: "string", repeat: true, advanced: true },
    {
      key: "createdAt",
      label: "Created at",
      type: "datetime",
      advanced: true,
      hint: "If this post is being migrated from another source, its original creation time " +
        "(ISO 8601).",
    },
  ],
  output: idOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post<{ id: string }>("/posts/create", {
      authorID: input.authorID,
      boardID: input.boardID,
      title: input.title,
      details: input.details,
      byID: input.byID,
      categoryID: input.categoryID,
      customFields: asOptionalJson(input.customFields, "customFields"),
      eta: input.eta,
      etaPublic: input.etaPublic,
      ownerID: input.ownerID,
      imageURLs: toList(input.imageURLs),
      createdAt: input.createdAt,
    });
  },
};

export default postCreate;
