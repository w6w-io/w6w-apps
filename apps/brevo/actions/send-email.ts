import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";

interface EmailAddress {
  email: string;
  name?: string;
}

interface Attachment {
  /** URL of an attachment, OR omit and provide `content`+`name`. */
  url?: string;
  /** Base64-encoded content. */
  content?: string;
  /** Filename, required when using `content`. */
  name?: string;
}

interface Input {
  sender: EmailAddress | string;
  to: EmailAddress[] | string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  cc?: EmailAddress[] | string;
  bcc?: EmailAddress[] | string;
  replyTo?: EmailAddress | string;
  attachment?: Attachment[];
  tags?: string[] | string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

/**
 * Turn a comma-separated string or an `EmailAddress` array into Brevo's
 * `{email, name?}` array shape. n8n did this via nodemailer's MailComposer;
 * here we implement a small dependency-free parser that accepts:
 *
 *   "a@x.com, b@x.com"
 *   "Ada <a@x.com>, Bo <b@x.com>"
 *   [{ email: "a@x.com" }, ...]
 */
export function parseEmailList(input: EmailAddress[] | string | undefined): EmailAddress[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((e) => ({ email: e.email, ...(e.name ? { name: e.name } : {}) }));
  return input
    .split(",")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      // "Name <a@x.com>" form
      const match = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
      if (match) {
        const name = match[1].trim().replace(/^"|"$/g, "");
        const email = match[2].trim();
        return name ? { email, name } : { email };
      }
      return { email: raw };
    });
}

function parseSingle(input: EmailAddress | string | undefined): EmailAddress | undefined {
  if (!input) return undefined;
  if (typeof input !== "string") return { email: input.email, ...(input.name ? { name: input.name } : {}) };
  return parseEmailList(input)[0];
}

const sendEmail: ActionDefinition<Input> = {
  key: "send-email",
  type: "perform",
  resource: "email",
  title: "Send Transactional Email",
  description:
    "Send a transactional email via Brevo (POST /smtp/email). Provide either `htmlContent` or `textContent`.",
  params: [
    {
      key: "sender",
      label: "Sender",
      type: "string",
      required: true,
      hint: "Email string, `Name <email>`, or JSON `{email, name?}`.",
    },
    {
      key: "to",
      label: "Recipients",
      type: "string",
      required: true,
      hint: "Comma-separated list, or JSON array of `{email, name?}`.",
    },
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "htmlContent", label: "HTML Content", type: "text" },
    { key: "textContent", label: "Text Content", type: "text" },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    { key: "replyTo", label: "Reply To", type: "string" },
    {
      key: "attachment",
      label: "Attachments",
      type: "json",
      hint: "JSON array of `{url}` or `{content, name}` (base64 content).",
    },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated list or JSON array." },
    { key: "headers", label: "Custom Headers", type: "json" },
    { key: "params", label: "Template Parameters", type: "json" },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    const sender = parseSingle(input.sender);
    const to = parseEmailList(input.to);
    const body: Record<string, unknown> = { sender, to, subject: input.subject };
    if (input.htmlContent) body.htmlContent = input.htmlContent;
    if (input.textContent) body.textContent = input.textContent;
    const cc = parseEmailList(input.cc);
    if (cc.length) body.cc = cc;
    const bcc = parseEmailList(input.bcc);
    if (bcc.length) body.bcc = bcc;
    const replyTo = parseSingle(input.replyTo);
    if (replyTo) body.replyTo = replyTo;
    if (input.attachment && input.attachment.length) body.attachment = input.attachment;
    if (input.tags) {
      body.tags = Array.isArray(input.tags)
        ? input.tags
        : input.tags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (input.headers) body.headers = input.headers;
    if (input.params) body.params = input.params;
    return client.request("/smtp/email", { method: "POST", body });
  },
};

export default sendEmail;
