import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";

interface Input {
  subject: string;
  previewText?: string;
  editorType?: "classic" | "visual";
  bodyHtml?: string;
  senderEmail?: string;
  senderName?: string;
}

/**
 * `POST /api/mailing/newsletters`.
 *
 * **`bodyHtml` is not arbitrary HTML.** The vendor's own schema description
 * (copied verbatim into the param hint below) specifies a constrained
 * TipTap-compatible fragment: only `p`/`h2`-`h4`/`ul`/`ol`/`figure` at the top
 * level, a narrow inline tag set, `span style` limited to
 * font-size/font-family/color/background-color, and three allowed
 * substitutions (`{email}`, `{first_name}`, `{surname}`). Sending a full HTML
 * document — `<html>`, `<div>`, inline event handlers, arbitrary CSS — is
 * explicitly out of spec, not merely unstyled. Getting this wrong produces a
 * newsletter that silently drops or mis-renders content rather than an error.
 */
const newsletterCreate: ActionDefinition<Input> = {
  key: "newsletter-create",
  type: "perform",
  resource: "newsletter",
  title: "Create Newsletter",
  description: "Create a one-off Newsletter (email blast).",
  idempotent: false,
  params: [
    {
      key: "subject",
      label: "Subject",
      type: "string",
      required: true,
      validation: { maxLength: 255 },
    },
    { key: "previewText", label: "Preview text", type: "string", validation: { maxLength: 140 } },
    {
      key: "editorType",
      label: "Editor type",
      type: "select",
      default: "classic",
      options: [
        { value: "classic", label: "Classic" },
        { value: "visual", label: "Visual" },
      ],
    },
    {
      key: "bodyHtml",
      label: "Body HTML",
      type: "code",
      ui: "code:html",
      hint: "A constrained TipTap-compatible HTML fragment, not arbitrary HTML: top-level nodes " +
        "limited to p/h2/h3/h4/ul/ol/figure, inline tags limited to span/strong/em/u/s/a/br, " +
        "span style limited to font-size/font-family/color/background-color, and only the " +
        "{email}, {first_name} and {surname} substitutions. See systeme.io's schema " +
        "documentation for the full ruleset — a document outside it silently drops or " +
        "mis-renders rather than erroring.",
    },
    {
      key: "senderEmail",
      label: "Sender email",
      type: "string",
      hint: "Optional. Omit to use the default marketing sender.",
    },
    {
      key: "senderName",
      label: "Sender name",
      type: "string",
      hint: "Optional. Omit to use the default marketing sender name.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Newsletter ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "content", type: "object", label: "Content (subject, body, sender)" },
    { key: "state", type: "object", label: "State (isSent)" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).post("/api/mailing/newsletters", {
      content: compact({
        subject: input.subject,
        previewText: input.previewText,
        editorType: input.editorType,
        bodyHtml: input.bodyHtml,
        senderEmail: input.senderEmail,
        senderName: input.senderName,
      }),
    });
  },
};

export default newsletterCreate;
