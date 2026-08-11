import type { ActionDefinition } from "@w6w/types";
import { compact, idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import { fieldsParam, videoIdParam } from "../lib/params.ts";

/**
 * `POST /videos/{video_id}/comments` — comment on a video.
 *
 * ## `text` or `richtext`, and exactly one of them
 *
 * Vimeo documents both body fields as optional but says of each: "Either this
 * field or the **text** / **richtext** field is required." Sending neither is a
 * `400` with error code 2207. So this action requires `text` — the plain, sane
 * case — and offers `richtext` alongside it for the rare caller that needs
 * formatting.
 *
 * `richtext` is "the rich comment in JSON stringified form", and the vendor's
 * own example is a ProseMirror document:
 * `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"I love this!"}]}]}`.
 * It is a `code` param rather than `json`, because Vimeo wants the **string**,
 * not a nested object — a `json` param whose value got parsed on the way in
 * would arrive as the wrong type.
 *
 * ## Not idempotent
 *
 * Every call posts another comment. There is no idempotency key, so a retry
 * double-posts — `idempotent: false` keeps the runtime from doing that
 * automatically.
 *
 * Requires a token with the `interact` scope. The documented refusals are worth
 * distinguishing when one shows up: `403` error code 3301 (flagged as spam),
 * 3411 (the account is unverified), 3412 (the account cannot comment at all)
 * and 3413 (comments are disabled on this video).
 */
interface Input {
  videoId: string;
  text: string;
  richtext?: string;
  fields?: string;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Comment on Video",
  description: "Post a comment on a video as the connected account.",
  idempotent: false,
  params: [
    videoIdParam,
    {
      key: "text",
      label: "Comment",
      type: "text",
      required: true,
      placeholder: "I love this!",
    },
    {
      key: "richtext",
      label: "Rich text (advanced)",
      type: "code",
      hint: "A stringified ProseMirror document, e.g. " +
        '`{"type":"doc","content":[{"type":"paragraph","content":[' +
        '{"type":"text","text":"I love this!"}]}]}`. Vimeo wants the JSON as a string.',
    },
    fieldsParam,
  ],
  output: [
    { key: "uri", type: "string", label: "The new comment's URI" },
    { key: "text", type: "string", label: "The comment as plain text" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).request(
      `/videos/${idFromRef(input.videoId, "Video ID")}/comments`,
      {
        method: "POST",
        query: { fields: toCsv(input.fields) },
        body: compact({ text: input.text, richtext: input.richtext }),
      },
    );
  },
};

export default commentCreate;
