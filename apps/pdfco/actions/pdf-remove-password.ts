import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import {
  asyncParam,
  expirationParam,
  nameParam,
  passwordParam,
  profilesParam,
  urlParam,
} from "../lib/params.ts";

/** `POST /v1/pdf/security/remove` — decrypt a PDF and clear its restrictions. */
interface Input {
  url: string;
  password?: string;
  async?: boolean;
  name?: string;
  expiration?: number;
  profiles?: unknown;
}

interface Output {
  url?: string;
  pageCount?: number;
  jobId?: string;
}

const pdfRemovePassword: ActionDefinition<Input, Output> = {
  key: "pdf-remove-password",
  type: "perform",
  title: "Remove Password from PDF",
  description: "Remove an existing password and any restrictions from a PDF.",
  idempotent: false,
  params: [
    urlParam(),
    { ...passwordParam(), hint: "The PDF's current owner or user password.", advanced: false },
    asyncParam(),
    nameParam(),
    expirationParam(),
    profilesParam(),
  ],
  output: [
    { key: "url", type: "string", label: "Output PDF URL" },
    { key: "pageCount", type: "number", label: "Page count" },
  ],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/pdf/security/remove", compact({ ...input }));
  },
};

export default pdfRemovePassword;
