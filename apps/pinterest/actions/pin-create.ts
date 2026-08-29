import type { ActionDefinition } from "@w6w/types";
import { compact, PinterestClient } from "../lib/client.ts";
import { adAccountIdParam, boardIdParam } from "../lib/params.ts";

/**
 * `POST /v5/pins` — create a Pin on a board (or board section).
 *
 * ## Only the `image_url` media source is implemented
 *
 * `PinCreate.media_source` is a discriminated union of six shapes
 * (`image_url`, `image_base64`, `video_id`, `multiple_image_base64`,
 * `multiple_image_urls`, `pin_url`). This action supports exactly
 * `image_url` — `{ source_type: "image_url", url }` — because it is the one
 * shape Pinterest fetches server-side from a URL this app already has: no
 * upload step, no base64 payload size limit to reason about.
 *
 * `image_base64` and the multi-image variants require sending image BYTES in
 * the request body, which is possible but is a materially different, heavier
 * action shape (`type: "file"` params, base64 encoding) left for a future
 * iteration rather than invented here.
 *
 * `video_id` requires first registering a video via `POST /v5/media`, which
 * hands back a one-time, per-request upload target that is not
 * `api.pinterest.com` — a static `w6w.network.allow` cannot declare it in
 * advance. Same reasoning as LinkedIn's absent image/video upload support in
 * this pack.
 *
 * `pin_url` (re-pin from another URL Pinterest already knows) is left out
 * because Pinterest's own guidance for that flow is the client-side "Save
 * button", not this API, per the endpoint's own description.
 *
 * `board_id` and the media URL are not marked `required` in Pinterest's own
 * `PinCreate` schema, but a Pin cannot exist without a board or without media
 * — both are made `required: true` here rather than let the API reject an
 * incomplete call.
 */
interface Input {
  boardId: string;
  imageUrl: string;
  title?: string;
  description?: string;
  altText?: string;
  link?: string;
  boardSectionId?: string;
  adAccountId?: string;
}

const pinCreate: ActionDefinition<Input> = {
  key: "pin-create",
  type: "perform",
  resource: "pin",
  title: "Create Pin (from image URL)",
  description:
    "Create an image Pin on a board. Pinterest fetches the image from the URL you provide — no " +
    "upload step needed.",
  idempotent: false,
  params: [
    boardIdParam,
    {
      key: "imageUrl",
      label: "Image URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/photo.jpg",
      hint: "A publicly reachable image URL. Pinterest fetches it server-side.",
    },
    { key: "title", label: "Title", type: "string", validation: { maxLength: 100 } },
    { key: "description", label: "Description", type: "text", validation: { maxLength: 800 } },
    {
      key: "altText",
      label: "Alt text",
      type: "string",
      validation: { maxLength: 500 },
      hint: "Accessibility description, shown to screen readers.",
    },
    {
      key: "link",
      label: "Destination link",
      type: "string",
      validation: { maxLength: 2048 },
      hint: "Where the Pin sends people who click through.",
    },
    {
      key: "boardSectionId",
      label: "Board section",
      type: "string",
      advanced: true,
      hint: "Numeric ID of a section within the board, from board-create's sections endpoint.",
    },
    adAccountIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Pin ID" },
    { key: "link", type: "string", label: "Destination link" },
    { key: "board_id", type: "string", label: "Board ID" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json(`/pins`, {
      method: "POST",
      query: { ad_account_id: input.adAccountId },
      body: compact({
        board_id: input.boardId,
        board_section_id: input.boardSectionId,
        title: input.title,
        description: input.description,
        alt_text: input.altText,
        link: input.link,
        media_source: { source_type: "image_url", url: input.imageUrl },
      }),
    });
  },
};

export default pinCreate;
