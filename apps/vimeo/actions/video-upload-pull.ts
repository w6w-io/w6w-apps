import type { ActionDefinition } from "@w6w/types";
import { nest, toCsv, VimeoClient } from "../lib/client.ts";
import {
  commentPrivacyOptions,
  videoPrivacyEmbedOptions,
  videoPrivacyViewOptions,
} from "../lib/params.ts";

/**
 * `POST /me/videos` with `upload.approach = "pull"` — create a video from a URL.
 *
 * ## Why pull, and only pull
 *
 * `/api/upload/videos` documents three upload approaches and only one of them
 * can be expressed as a single server-side API call:
 *
 *  - **tus** (resumable) — the POST returns `upload.upload_link` and the client
 *    then drives a multi-request tus session with `PATCH`, `Upload-Offset` and
 *    `Tus-Resumable` headers against a Vimeo upload host. It needs the file
 *    bytes and a stateful loop.
 *  - **post** (form-based) — the POST returns an `upload.form` the *end user's
 *    browser* submits. It is a browser flow by construction.
 *  - **pull** — "you point us toward a video file that already exists on the
 *    internet. We make a copy." One request, no file handling, no browser.
 *
 * So this action models `pull` and the README says plainly that the other two
 * are out of scope rather than pretending otherwise.
 *
 * ## What Vimeo requires of the link, verbatim from the guide
 *
 *  - It must resolve **directly to a video file**. A page with an embedded
 *    player is not enough.
 *  - It must be URL-encoded, but slashes in the path must not be escaped.
 *  - If it is on a CDN it should be unsigned and public; a presigned URL is
 *    acceptable only if it expires at least **six hours** after Vimeo receives
 *    it.
 *  - A redirect works only if it points at the same domain or host.
 *  - Maximum 16,384 characters.
 *
 * ## The failure that looks like success
 *
 * The guide is explicit and this is the finding most likely to waste a day:
 * "Since our uploader accepts a wide range of video codecs and file types, we
 * can't analyze the file until it's on our server. Therefore, links to invalid
 * or non-video files (like MP3 or PDF) still return HTTP **201** and generate a
 * video URI." The failure only shows up later as `status` of `uploading_error`
 * or `transcoding_error` on the video. The action therefore surfaces
 * `upload.status` and `status` in its output, and its description says to check
 * them.
 *
 * ## Not idempotent
 *
 * Every call creates a new video placeholder. Vimeo offers no idempotency key
 * on this endpoint, so a retry produces a second video — hence
 * `idempotent: false`, which keeps the runtime from retrying it. The guide adds
 * a related warning worth repeating: a placeholder persists even if no file
 * ever arrives.
 *
 * Requires a token with the `upload` scope, which Vimeo grants only to
 * authenticated (user-bound) tokens.
 */
interface Input {
  link: string;
  name?: string;
  description?: string;
  size?: number;
  privacyView?: string;
  password?: string;
  privacyEmbed?: string;
  privacyDownload?: boolean;
  privacyComments?: string;
  fields?: string;
}

const videoUploadPull: ActionDefinition<Input> = {
  key: "video-upload-pull",
  type: "perform",
  resource: "video",
  title: "Upload Video from URL",
  description:
    "Create a Vimeo video by having Vimeo pull a video file from a public URL. Returns 201 even " +
    "for a link that is not a video — check `status` and `upload.status` afterwards.",
  idempotent: false,
  params: [
    {
      key: "link",
      label: "Video file URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/videos/clip.mp4",
      validation: { maxLength: 16384 },
      hint: "Must resolve directly to the video file, not to a page with a player. Unsigned and " +
        "public if it is on a CDN; a presigned URL must have at least six hours left. Redirects " +
        "work only within the same host.",
    },
    {
      key: "name",
      label: "Title",
      type: "string",
      hint: "Vimeo uses the file name when this is left blank on a pull upload.",
    },
    { key: "description", label: "Description", type: "text", validation: { maxLength: 5000 } },
    {
      key: "size",
      label: "File size (bytes)",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Vimeo's own pull example sends it (`upload: { approach: 'pull', size: 800000000, " +
        "link: … }`). It is explicitly required only for the resumable approach, so it is left " +
        "optional here — send it when you know it.",
    },
    {
      key: "privacyView",
      label: "Who can watch",
      type: "select",
      options: videoPrivacyViewOptions,
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint: "Only used when Who can watch is `password`.",
    },
    {
      key: "privacyEmbed",
      label: "Where it can be embedded",
      type: "select",
      options: videoPrivacyEmbedOptions,
    },
    { key: "privacyDownload", label: "Allow downloads", type: "boolean" },
    {
      key: "privacyComments",
      label: "Who can comment",
      type: "select",
      options: commentPrivacyOptions,
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      placeholder: "uri,name,status,upload",
      hint: "Trim the returned representation. Keep `status` and `upload` — they are how a bad " +
        "link shows up.",
    },
  ],
  output: [
    { key: "uri", type: "string", label: "The new video's URI" },
    { key: "status", type: "string", label: "Availability: uploading, transcoding, available, …" },
    { key: "upload", type: "object", label: "Upload block — `approach` should read `pull`" },
  ],

  execute(input, ctx) {
    ctx.log("info", "starting a pull upload");
    const body = nest({
      // `upload.approach`, not `type`. Vimeo returns 400 with error code 3116
      // for the old `type` payload parameter: "Use upload.approach starting
      // from API version 3.4."
      "upload.approach": "pull",
      "upload.link": input.link,
      "upload.size": input.size,
      name: input.name,
      description: input.description,
      "privacy.view": input.privacyView,
      "privacy.embed": input.privacyEmbed,
      "privacy.download": input.privacyDownload,
      "privacy.comments": input.privacyComments,
      password: input.password,
    });

    return new VimeoClient(ctx).request("/me/videos", {
      method: "POST",
      query: { fields: toCsv(input.fields) },
      body,
    });
  },
};

export default videoUploadPull;
