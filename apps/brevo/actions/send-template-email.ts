import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";
import { parseEmailList } from "./send-email.ts";

interface EmailAddress {
  email: string;
  name?: string;
}

interface Attachment {
  url?: string;
  content?: string;
  name?: string;
}

interface Input {
  templateId: number;
  to: EmailAddress[] | string;
  cc?: EmailAddress[] | string;
  bcc?: EmailAddress[] | string;
  params?: Record<string, unknown>;
  attachment?: Attachment[];
  tags?: string[] | string;
  headers?: Record<string, string>;
}

const sendTemplateEmail: ActionDefinition<Input> = {
  key: "send-template-email",
  type: "perform",
  resource: "email",
  title: "Send Email from Template",
  description:
    "Send a transactional email via an existing Brevo template (POST /smtp/email with `templateId`).",
  params: [
    { key: "templateId", label: "Template ID", type: "number", required: true },
    {
      key: "to",
      label: "Recipients",
      type: "string",
      required: true,
      hint: "Comma-separated list, or JSON array of `{email, name?}`.",
    },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    { key: "params", label: "Template Parameters", type: "json" },
    {
      key: "attachment",
      label: "Attachments",
      type: "json",
      hint: "JSON array of `{url}` or `{content, name}`.",
    },
    { key: "tags", label: "Tags", type: "string" },
    { key: "headers", label: "Custom Headers", type: "json" },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    const to = parseEmailList(input.to);
    const body: Record<string, unknown> = { templateId: input.templateId, to };
    const cc = parseEmailList(input.cc);
    if (cc.length) body.cc = cc;
    const bcc = parseEmailList(input.bcc);
    if (bcc.length) body.bcc = bcc;
    if (input.params) body.params = input.params;
    if (input.attachment && input.attachment.length) body.attachment = input.attachment;
    if (input.tags) {
      body.tags = Array.isArray(input.tags)
        ? input.tags
        : input.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (input.headers) body.headers = input.headers;
    return client.request("/smtp/email", { method: "POST", body });
  },
};

export default sendTemplateEmail;
