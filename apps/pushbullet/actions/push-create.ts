import type { ActionDefinition } from "@w6w/types";
import { compact, PushbulletClient } from "../lib/client.ts";

/**
 * `POST /v2/pushes` — send a note, link or file push.
 *
 * ## Exactly one target
 *
 * The vendor's docs: "Each push has a target, if you don't specify a target,
 * we will broadcast it to all of the user's devices. Only one target may be
 * specified." — `deviceIden`, `email`, `channelTag` and `clientIden` are all
 * optional for that reason, and this action does not enforce mutual
 * exclusivity beyond documenting it, matching the vendor's own permissive
 * request shape.
 *
 * ## `type="file"` needs an upload first
 *
 * A file push's `fileUrl`/`fileName`/`fileType` come from `upload-request`
 * (upload the file's bytes to the `upload_url` it returns, then push here with
 * the `file_url`/`file_name`/`file_type` from that same response) — this
 * action only sends the push once you already have that URL.
 *
 * ## Idempotency
 *
 * `guid` is documented as making a push "mostly idempotent": "sending another
 * push with the same guid is unlikely to create another push (it will return
 * the previously created push)." That is a property of the *caller's input*
 * (whether a `guid` was supplied), not a blanket guarantee of the endpoint, so
 * this is declared `idempotent: false` — the honest reading — and the hint
 * steers a retry-safe caller toward setting one, exactly as Apify's
 * `dataset-create` documents the same shape of guarantee.
 */
interface Input {
  type: "note" | "link" | "file";
  title?: string;
  body?: string;
  url?: string;
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  sourceDeviceIden?: string;
  deviceIden?: string;
  clientIden?: string;
  channelTag?: string;
  email?: string;
  guid?: string;
}

const pushCreate: ActionDefinition<Input> = {
  key: "push-create",
  type: "perform",
  resource: "push",
  title: "Create Push",
  description: "Send a note, link or file push to a device, an email address, a channel's " +
    "subscribers, or an OAuth client's users — or broadcast to all of the account's devices.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "note",
      options: [
        { value: "note", label: "Note" },
        { value: "link", label: "Link" },
        { value: "file", label: "File" },
      ],
    },
    { key: "title", label: "Title", type: "string", hint: "Used for all push types." },
    { key: "body", label: "Body", type: "text", hint: "Used for all push types." },
    {
      key: "url",
      label: "URL",
      type: "string",
      showIf: { "==": [{ var: "type" }, "link"] },
      hint: "Required for a link push.",
    },
    {
      key: "fileName",
      label: "File name",
      type: "string",
      showIf: { "==": [{ var: "type" }, "file"] },
    },
    {
      key: "fileType",
      label: "File MIME type",
      type: "string",
      showIf: { "==": [{ var: "type" }, "file"] },
    },
    {
      key: "fileUrl",
      label: "File URL",
      type: "string",
      showIf: { "==": [{ var: "type" }, "file"] },
      hint: "From a prior `upload-request` call, after the file has been uploaded.",
    },
    {
      key: "deviceIden",
      label: "Target device",
      type: "string",
      advanced: true,
      hint: "Send to one specific device. Omit all four targets to broadcast to every device.",
    },
    {
      key: "email",
      label: "Target email",
      type: "string",
      advanced: true,
      hint: "Delivered in-app if that address is a Pushbullet user, otherwise sent as an email.",
    },
    {
      key: "channelTag",
      label: "Target channel tag",
      type: "string",
      advanced: true,
      hint: "Sends to every subscriber of a channel you own.",
    },
    {
      key: "clientIden",
      label: "Target OAuth client",
      type: "string",
      advanced: true,
      hint: "Sends to every user who has granted access to an OAuth client you own.",
    },
    {
      key: "sourceDeviceIden",
      label: "Source device",
      type: "string",
      advanced: true,
      hint: "Device iden of the sender, for display purposes only. Optional.",
    },
    {
      key: "guid",
      label: "Idempotency key",
      type: "string",
      advanced: true,
      hint: "Set a unique value to make a retried call return the original push instead of " +
        "creating a duplicate.",
    },
  ],
  output: [
    { key: "iden", type: "string", label: "Push ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "created", type: "number", label: "Created (unix seconds)" },
  ],

  async execute(input, ctx) {
    return await new PushbulletClient(ctx).json("/pushes", {
      method: "POST",
      body: compact({
        type: input.type,
        title: input.title,
        body: input.body,
        url: input.url,
        file_name: input.fileName,
        file_type: input.fileType,
        file_url: input.fileUrl,
        source_device_iden: input.sourceDeviceIden,
        device_iden: input.deviceIden,
        client_iden: input.clientIden,
        channel_tag: input.channelTag,
        email: input.email,
        guid: input.guid,
      }),
    });
  },
};

export default pushCreate;
