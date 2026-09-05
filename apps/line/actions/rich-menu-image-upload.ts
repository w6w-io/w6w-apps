import type { ActionDefinition } from "@w6w/types";
import { API_DATA_HOST, base64ToBytes, LineClient } from "../lib/client.ts";
import { richMenuIdParam } from "../lib/params.ts";

interface Input {
  richMenuId: string;
  image: string;
  contentType: string;
}

/**
 * `POST /v2/bot/richmenu/{richMenuId}/content` on `api-data.line.me` — attach the tappable image to
 * an already-created rich menu.
 *
 * ## Bytes, not a URL
 *
 * LINE's request body is the raw image bytes with `Content-Type: image/jpeg` or `image/png` — not
 * a JSON field naming a URL it fetches itself (unlike, say, Cloudinary's upload API). A workflow
 * cannot attach bytes it never had, so `image` here takes base64 (optionally a `data:` URI) — bytes
 * a previous step (e.g. this app's own `content-get`, or any file-producing action) already has in
 * hand, decoded and sent as an `ArrayBuffer` so no byte is corrupted in transit (see
 * `lib/client.ts`'s `bytesToBase64` doc for why that matters). This app never fetches an arbitrary
 * caller-supplied image URL itself, because such a host is never in `w6w.network.allow`.
 *
 * ## One-shot
 *
 * LINE's own note: "You can't replace an image set to a rich menu." A second upload to the same
 * rich menu ID fails with `400 {"message":"An image has already been uploaded to the richmenu"}` —
 * to change the image, create a new rich menu. So this is declared **not idempotent**.
 *
 * ## Requirements (LINE's, verified against the reference)
 *
 * JPEG or PNG; 800–2500px wide; 250px or taller; aspect ratio (width/height) >= 1.45; max 1 MB.
 */
const richMenuImageUpload: ActionDefinition<Input> = {
  key: "rich-menu-image-upload",
  type: "perform",
  resource: "rich-menu",
  title: "Upload Rich Menu Image",
  description:
    "Attach an image (JPEG or PNG, 800-2500px wide, aspect ratio >= 1.45, max 1MB) to a rich " +
    "menu. Can only be done once per rich menu.",
  idempotent: false,
  params: [
    richMenuIdParam,
    {
      key: "image",
      label: "Image (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded JPEG or PNG bytes, or a `data:image/...;base64,...` URI — a workflow " +
        "cannot attach bytes it never had.",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "select",
      required: true,
      options: [
        { value: "image/jpeg", label: "JPEG" },
        { value: "image/png", label: "PNG" },
      ],
      hint: "Must match the image's real format — a mismatch is refused with 415.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const richMenuId = String(input.richMenuId ?? "").trim();
    const image = String(input.image ?? "").trim();
    const contentType = String(input.contentType ?? "").trim();
    if (!richMenuId) throw new Error("`richMenuId` is required");
    if (!image) throw new Error("`image` is required");
    if (contentType !== "image/jpeg" && contentType !== "image/png") {
      throw new Error("`contentType` must be image/jpeg or image/png");
    }
    const bytes = base64ToBytes(image);
    ctx.log("info", "uploading a LINE rich menu image", {
      richMenuId,
      contentType,
      bytes: bytes.length,
    });
    return new LineClient(ctx, API_DATA_HOST).binaryPost(
      `/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`,
      bytes,
      contentType,
    ).then(() => ({}));
  },
};

export default richMenuImageUpload;
