import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, stripSecrets, VapiClient } from "../lib/client.ts";

/**
 * `POST /file` — `multipart/form-data`, per `CreateFileDTO`.
 *
 * Hand-builds the multipart body as plain text, the same technique this
 * pack's `apps/box` uses: every `ctx.fetch` body in this sandbox is coerced
 * to a string on its way to the network, so a real binary upload cannot
 * survive the trip — this action is UTF-8 text content only.
 */
interface Input {
  fileName: string;
  content: string;
  purpose?: string;
  metadata?: unknown;
}

const BOUNDARY = "w6wVapiUploadBoundary4e8b21f6";

function escapeHeaderValue(value: string): string {
  return value.replace(/["\\\r\n]/g, "");
}

function buildMultipart(
  fileName: string,
  content: string,
  purpose: string | undefined,
  metadata: string | undefined,
): string {
  const safeName = escapeHeaderValue(fileName);
  const parts = [
    `--${BOUNDARY}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
    `Content-Type: text/plain\r\n\r\n` +
    `${content}\r\n`,
  ];
  if (purpose) {
    parts.push(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\n${purpose}\r\n`,
    );
  }
  if (metadata) {
    parts.push(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n${metadata}\r\n`,
    );
  }
  parts.push(`--${BOUNDARY}--\r\n`);
  return parts.join("");
}

const fileCreate: ActionDefinition<Input> = {
  key: "file-create",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload UTF-8 text content as a new file. Binary uploads are not supported.",
  idempotent: false,
  params: [
    { key: "fileName", label: "File Name", type: "string", required: true, hint: "e.g. notes.txt" },
    { key: "content", label: "File Content", type: "text", required: true },
    {
      key: "purpose",
      label: "Purpose",
      type: "select",
      options: [
        { value: "assistant", label: "Assistant (knowledge base v1)" },
        { value: "composer-attachment", label: "Composer attachment" },
        { value: "knowledge-base-v2", label: "Knowledge base v2" },
      ],
    },
    {
      key: "metadata",
      label: "Metadata (JSON)",
      type: "json",
      hint: "Sent as JSON-encoded text, up to 4096 characters.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const metadata = asOptionalJson<unknown>(input.metadata, "metadata");
    const body = buildMultipart(
      input.fileName,
      input.content,
      input.purpose,
      metadata !== undefined ? JSON.stringify(metadata) : undefined,
    );
    const file = await new VapiClient(ctx).json("/file", {
      method: "POST",
      rawBody: { contentType: `multipart/form-data; boundary=${BOUNDARY}`, text: body },
    });
    return stripSecrets(file);
  },
};

export default fileCreate;
