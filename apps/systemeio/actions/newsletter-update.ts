import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
  subject?: string;
  previewText?: string;
  editorType?: "classic" | "visual";
  bodyHtml?: string;
  senderEmail?: string;
  senderName?: string;
}

/**
 * `PATCH /api/mailing/newsletters/{id}` — merge-patch. Note `PUT` on this
 * resource (`api_mailingnewsletters_id_put`) is marked `deprecated: true` by
 * the vendor's own OpenAPI document ("This endpoint is deprecated. Use PATCH
 * instead") — this app implements only PATCH.
 *
 * See `newsletter-create.ts` for the `bodyHtml` constraint, which applies
 * identically here.
 */
const newsletterUpdate: ActionDefinition<Input> = {
  key: "newsletter-update",
  type: "perform",
  resource: "newsletter",
  title: "Update Newsletter",
  description: "Update a Newsletter's content. Only unsent newsletters can meaningfully change.",
  idempotent: true,
  params: [
    { key: "id", label: "Newsletter ID", type: "string", required: true },
    { key: "subject", label: "Subject", type: "string", validation: { maxLength: 255 } },
    { key: "previewText", label: "Preview text", type: "string", validation: { maxLength: 140 } },
    {
      key: "editorType",
      label: "Editor type",
      type: "select",
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
      hint: "Constrained TipTap-compatible HTML fragment — see Create Newsletter's hint for the " +
        "full ruleset.",
    },
    { key: "senderEmail", label: "Sender email", type: "string" },
    { key: "senderName", label: "Sender name", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Newsletter ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "content", type: "object", label: "Content (subject, body, sender)" },
    { key: "state", type: "object", label: "State (isSent)" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).patch(
      `/api/mailing/newsletters/${encodeURIComponent(input.id)}`,
      {
        content: compact({
          subject: input.subject,
          previewText: input.previewText,
          editorType: input.editorType,
          bodyHtml: input.bodyHtml,
          senderEmail: input.senderEmail,
          senderName: input.senderName,
        }),
      },
    );
  },
};

export default newsletterUpdate;
