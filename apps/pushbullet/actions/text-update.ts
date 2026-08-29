import type { ActionDefinition } from "@w6w/types";
import { compact, PushbulletClient } from "../lib/client.ts";

/**
 * `POST /v2/texts/{iden}` — update a queued text. The vendor's own note: "If
 * the text has already been sent this will not affect the message" — so
 * calling this twice with the same fields settles into the same state either
 * way.
 */
interface Input {
  iden: string;
  targetDeviceIden?: string;
  addresses?: string[];
  message?: string;
  guid?: string;
  fileType?: string;
  skipDeleteFile?: boolean;
}

const textUpdate: ActionDefinition<Input> = {
  key: "text-update",
  type: "perform",
  resource: "text",
  title: "Update Text",
  description: "Update a queued text message. Has no effect if it has already been sent.",
  idempotent: true,
  params: [
    { key: "iden", label: "Text ID", type: "string", required: true },
    { key: "targetDeviceIden", label: "Target device", type: "string" },
    {
      key: "addresses",
      label: "Phone numbers",
      type: "array",
      item: { type: "string", placeholder: "+13035551212" },
    },
    { key: "message", label: "Message", type: "text" },
    { key: "fileType", label: "File MIME type", type: "string", advanced: true },
    { key: "guid", label: "Client GUID", type: "string", advanced: true },
    {
      key: "skipDeleteFile",
      label: "Keep attached file on delete",
      type: "boolean",
      advanced: true,
      hint: "Documented as settable only to true.",
    },
  ],
  output: [{ key: "iden", type: "string", label: "Text ID" }],

  async execute(input, ctx) {
    const data = compact({
      target_device_iden: input.targetDeviceIden,
      addresses: input.addresses,
      message: input.message,
      guid: input.guid,
      file_type: input.fileType,
    });
    return await new PushbulletClient(ctx).json(`/texts/${encodeURIComponent(input.iden)}`, {
      method: "POST",
      body: compact({
        iden: input.iden,
        ...(Object.keys(data).length > 0 ? { data } : {}),
        skip_delete_file: input.skipDeleteFile,
      }),
    });
  },
};

export default textUpdate;
