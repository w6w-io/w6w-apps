import type { ActionDefinition } from "@w6w/types";
import { compact, PushbulletClient } from "../lib/client.ts";

/**
 * `POST /v2/texts` — send an SMS (one address) or group MMS (several
 * addresses) through an Android device with SMS permissions granted.
 *
 * The vendor's own caveat: "Text messages are queued and sent as soon as
 * possible. If the sending device does not come online and sync within 1
 * hour, the message is canceled and will not send" — this app cannot make
 * that faster, only queue the request.
 *
 * `guid` is documented to dedupe retries ("used to identify a text message to
 * ensure it is not sent multiple times in the case create-text is called for
 * it more than once"), the same shape of guarantee as `push-create`'s `guid`
 * — optional, so declared non-idempotent overall.
 */
interface Input {
  targetDeviceIden: string;
  addresses: string[];
  message?: string;
  guid?: string;
  fileUrl?: string;
  fileType?: string;
  skipDeleteFile?: boolean;
}

const textCreate: ActionDefinition<Input> = {
  key: "text-create",
  type: "perform",
  resource: "text",
  title: "Send Text (SMS/MMS)",
  description: "Send an SMS to one phone number, or an MMS group message to several, through " +
    "an Android device with SMS permissions granted.",
  idempotent: false,
  params: [
    {
      key: "targetDeviceIden",
      label: "Target device",
      type: "string",
      required: true,
      hint: "The Android device to send from. It must have SMS permissions granted in Pushbullet.",
    },
    {
      key: "addresses",
      label: "Phone numbers",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "+13035551212" },
      hint: "One number sends an SMS; more than one sends a group MMS.",
    },
    { key: "message", label: "Message", type: "text" },
    {
      key: "fileUrl",
      label: "File URL",
      type: "string",
      advanced: true,
      hint: "From a prior `upload-request` call, to attach a picture message.",
    },
    {
      key: "fileType",
      label: "File MIME type",
      type: "string",
      advanced: true,
      hint: "Required when File URL is set.",
    },
    {
      key: "skipDeleteFile",
      label: "Keep attached file on delete",
      type: "boolean",
      advanced: true,
    },
    {
      key: "guid",
      label: "Idempotency key",
      type: "string",
      advanced: true,
      hint: "Set a unique value to stop a retried call sending the message twice.",
    },
  ],
  output: [{ key: "iden", type: "string", label: "Text ID" }],

  async execute(input, ctx) {
    return await new PushbulletClient(ctx).json("/texts", {
      method: "POST",
      body: compact({
        data: compact({
          target_device_iden: input.targetDeviceIden,
          addresses: input.addresses,
          message: input.message,
          guid: input.guid,
          file_type: input.fileType,
        }),
        file_url: input.fileUrl,
        skip_delete_file: input.skipDeleteFile,
      }),
    });
  },
};

export default textCreate;
