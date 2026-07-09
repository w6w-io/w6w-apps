import type { ActionDefinition } from "@w6w/types";
import { CONTENT_URL, DropboxClient } from "../lib/client.ts";

interface Input {
  path: string;
  content: string;
  mode?: "add" | "overwrite" | "update";
  autorename?: boolean;
  mute?: boolean;
}

/**
 * Inlined text encoder — the app sandbox has `import: false`, so we can't
 * pull in helpers from jsr:@std/encoding. `TextEncoder` is built into every
 * modern JS runtime including Deno's sandbox.
 */
function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

const uploadFile: ActionDefinition<Input> = {
  key: "upload-file",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description:
    "Upload text content to a path in Dropbox. Uses the content endpoint; the parent folder must exist.",
  params: [
    {
      key: "path",
      label: "File Path",
      type: "string",
      required: true,
      hint: "Full destination path in Dropbox, e.g. /invoices/2026/invoice_1.txt.",
    },
    {
      key: "content",
      label: "File Content",
      type: "text",
      required: true,
      hint: "UTF-8 text to write. Binary uploads are not supported by this action yet.",
    },
    {
      key: "mode",
      label: "Write Mode",
      type: "select",
      options: [
        { value: "add", label: "Add (fail if exists)" },
        { value: "overwrite", label: "Overwrite" },
        { value: "update", label: "Update (client-visioned overwrite)" },
      ],
      default: "overwrite",
    },
    { key: "autorename", label: "Auto-rename on conflict", type: "boolean", default: false },
    { key: "mute", label: "Mute notifications", type: "boolean", default: false },
  ],

  async execute(input, ctx) {
    const client = new DropboxClient(ctx);
    return client.request(`${CONTENT_URL}/files/upload`, {
      dropboxApiArg: {
        path: input.path,
        mode: input.mode ?? "overwrite",
        autorename: input.autorename ?? false,
        mute: input.mute ?? false,
      },
      rawBody: encodeText(input.content),
    });
  },
};

export default uploadFile;
