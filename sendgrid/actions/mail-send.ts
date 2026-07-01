import type { ActionDefinition } from "@w6w/types";

/**
 * Generated from n8n: mail:send
 * Source: https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/SendGrid
 *
 * The execute body is a TODO — n8n routes through its own helpers; port the
 * relevant https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/SendGrid logic to a ctx.fetch call before shipping.
 */
const action: ActionDefinition = {
  key: "mail-send",
  type: "perform",
  resource: "mail",
  title: "Send an email",
  description: "Send an email",
  params: [
    {
      key: "fromEmail",
      label: "Sender Email",
      type: "string",
      default: "",
      hint: "Email address of the sender of the email",
    },
    {
      key: "fromName",
      label: "Sender Name",
      type: "string",
      default: "",
      hint: "Name of the sender of the email",
    },
    {
      key: "toEmail",
      label: "Recipient Email",
      type: "string",
      default: "",
      hint: "Comma-separated list of recipient email addresses",
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      default: "",
      hint: "Subject of the email to send",
    },
    {
      key: "dynamicTemplate",
      label: "Dynamic Template",
      type: "boolean",
      required: true,
      default: false,
      hint: "Whether this email will contain a dynamic template",
    },
    {
      key: "contentType",
      label: "MIME Type",
      type: "select",
      default: "text/plain",
      hint: "MIME type of the email to send",
      options: [
        {"value":"text/plain","label":"Plain Text"},
        {"value":"text/html","label":"HTML"},
      ],
    },
    {
      key: "contentValue",
      label: "Message Body",
      type: "string",
      required: true,
      default: "",
      hint: "Message body of the email to send",
    },
    {
      key: "templateId",
      label: "Template Name or ID",
      type: "select",
      default: [],
      hint: "Choose from the list, or specify an ID using an <a href=\"https://docs.n8n.io/code/expressions/\">expression</a>",
    },
    {
      key: "dynamicTemplateFields",
      label: "Dynamic Template Fields",
      type: "group",
      default: {},
      children: [
        {
          key: "key",
          label: "Key",
          type: "string",
          default: "",
          hint: "Key of the dynamic template field",
        },
        {
          key: "value",
          label: "Value",
          type: "string",
          default: "",
          hint: "Value for the field",
        },
      ],
    },
    {
      key: "additionalFields",
      label: "Additional Fields",
      type: "group",
      default: {},
      children: [
        {
          key: "attachments",
          label: "Attachments",
          type: "string",
          default: "",
          hint: "Comma-separated list of binary properties",
        },
        {
          key: "bccEmail",
          label: "BCC Email",
          type: "string",
          default: "",
          hint: "Comma-separated list of emails of the recipients of a blind carbon copy of the email",
        },
        {
          key: "categories",
          label: "Categories",
          type: "string",
          default: "",
          hint: "Comma-separated list of categories. Each category name may not exceed 255 characters.",
        },
        {
          key: "ccEmail",
          label: "CC Email",
          type: "string",
          default: "",
          hint: "Comma-separated list of emails of the recipients of a carbon copy of the email",
        },
        {
          key: "enableSandbox",
          label: "Enable Sandbox",
          type: "boolean",
          default: false,
          hint: "Whether to use to the sandbox for testing out email-sending functionality",
        },
        {
          key: "ipPoolName",
          label: "IP Pool Name",
          type: "string",
          default: "",
          hint: "The IP Pool that you would like to send this email from",
        },
        {
          key: "replyToEmail",
          label: "Reply-To Email",
          type: "string",
          default: "",
          hint: "Comma-separated list of email addresses that will appear in the reply-to field of the email",
        },
        {
          key: "headers",
          label: "Headers",
          type: "group",
          default: {},
          children: [
            {
              key: "key",
              label: "Key",
              type: "string",
              default: "",
              hint: "Key to set in the header object",
            },
            {
              key: "value",
              label: "Value",
              type: "string",
              default: "",
              hint: "Value to set in the header object",
            },
          ],
        },
        {
          key: "sendAt",
          label: "Send At",
          type: "datetime",
          default: "",
          hint: "When to deliver the email. Scheduling more than 72 hours in advance is forbidden.",
        },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const additional = (p.additionalFields ?? {}) as Record<string, unknown>;

    const fromEmail = String(p.fromEmail ?? "").trim();
    const toEmailRaw = String(p.toEmail ?? "").trim();
    const subject = String(p.subject ?? "").trim();
    const contentValue = String(p.contentValue ?? "");
    const contentType = String(p.contentType ?? "text/plain");

    if (!fromEmail) throw new Error("`fromEmail` is required");
    if (!toEmailRaw) throw new Error("`toEmail` is required");
    if (!subject) throw new Error("`subject` is required");
    if (!contentValue) throw new Error("`contentValue` is required");

    const splitEmails = (s: unknown): { email: string }[] =>
      String(s ?? "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
        .map((email) => ({ email }));

    const personalization: Record<string, unknown> = { to: splitEmails(toEmailRaw) };
    const cc = splitEmails(additional.ccEmail);
    const bcc = splitEmails(additional.bccEmail);
    if (cc.length) personalization.cc = cc;
    if (bcc.length) personalization.bcc = bcc;

    const body: Record<string, unknown> = {
      personalizations: [personalization],
      from: {
        email: fromEmail,
        ...(p.fromName ? { name: String(p.fromName) } : {}),
      },
      subject,
      content: [{ type: contentType, value: contentValue }],
    };

    if (additional.replyToEmail) {
      body.reply_to = { email: String(additional.replyToEmail) };
    }
    if (typeof additional.categories === "string" && additional.categories.length) {
      body.categories = additional.categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }
    if (additional.enableSandbox === true) {
      body.mail_settings = { sandbox_mode: { enable: true } };
    }
    if (typeof additional.ipPoolName === "string" && additional.ipPoolName.length) {
      body.ip_pool_name = additional.ipPoolName;
    }
    if (typeof additional.sendAt === "string" && additional.sendAt.length) {
      const ts = Math.floor(new Date(additional.sendAt).getTime() / 1000);
      if (Number.isFinite(ts)) body.send_at = ts;
    }

    ctx.log("info", "sending email via SendGrid", { from: fromEmail, to: toEmailRaw, subject });

    const res = await ctx.fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid /v3/mail/send returned ${res.status}: ${errText}`);
    }

    // SendGrid acks with 202 + empty body; the X-Message-Id header is the receipt.
    return {
      accepted: true,
      statusCode: res.status,
      messageId: res.headers.get("x-message-id") ?? undefined,
    };
  },
};

export default action;
