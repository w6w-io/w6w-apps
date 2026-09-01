import type { ActionDefinition } from "@w6w/types";
import { requestInvitations } from "../lib/client.ts";
import { businessUnitIdParam } from "../lib/params.ts";

/**
 * `POST https://invitations-api.trustpilot.com/v1/private/business-units/{businessUnitId}/email-invitations`
 * — private, OAuth (client-credentials) auth, on the Invitations API's own host.
 *
 * Sends a **service review** invitation email to one customer. Trustpilot's request body
 * also supports a `productReviewInvitation` block (a nested nested product list, each with
 * its own SKU/name/brand/GTIN) for product-review invitations sent in the same call — left
 * out of this action's params for now, since that shape is sizeable enough to deserve its
 * own action if a workflow needs it; this action covers the documented "basic service
 * review invitation" path Trustpilot's own Invitations overview walks through.
 *
 * Trustpilot's reference shows this endpoint's request body in full but — unlike every
 * other endpoint this app calls — publishes no worked response example for it. `execute`
 * therefore returns whatever body Trustpilot sends back, unshaped, rather than asserting
 * fields this app could not confirm.
 */
interface Input {
  businessUnitId: string;
  consumerEmail: string;
  consumerName: string;
  referenceNumber: string;
  locale: string;
  templateId: string;
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  locationId?: string;
  redirectUri?: string;
  preferredSendTime?: string;
  tags?: string;
}

const invitationSendEmail: ActionDefinition<Input, unknown> = {
  key: "invitation-send-email",
  type: "perform",
  resource: "invitation",
  title: "Send Service Review Invitation",
  description: "Email a customer an invitation to leave a Trustpilot service review.",
  idempotent: false,
  params: [
    businessUnitIdParam,
    {
      key: "consumerEmail",
      label: "Customer email",
      type: "string",
      required: true,
      row: "consumer",
    },
    {
      key: "consumerName",
      label: "Customer name",
      type: "string",
      required: true,
      row: "consumer",
    },
    {
      key: "referenceNumber",
      label: "Your reference number",
      type: "string",
      required: true,
      hint: "Your own internal reference for this customer/order — Trustpilot's " +
        "`referenceNumber` field.",
    },
    {
      key: "locale",
      label: "Locale",
      type: "string",
      required: true,
      placeholder: "en-US",
    },
    {
      key: "templateId",
      label: "Template",
      type: "string",
      required: true,
      hint: "A template id from “List Invitation Templates”.",
    },
    { key: "senderName", label: "Sender name", type: "string", row: "sender", advanced: true },
    { key: "senderEmail", label: "Sender email", type: "string", row: "sender", advanced: true },
    {
      key: "replyTo",
      label: "Reply-to email",
      type: "string",
      advanced: true,
    },
    {
      key: "locationId",
      label: "Location ID",
      type: "string",
      advanced: true,
      hint: "Attribute this invitation to a specific business location.",
    },
    {
      key: "redirectUri",
      label: "Redirect URL after review",
      type: "string",
      advanced: true,
    },
    {
      key: "preferredSendTime",
      label: "Preferred send time (ISO 8601)",
      type: "string",
      advanced: true,
      placeholder: "2026-09-23T13:37:00.000Z",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated tags recorded against the invitation.",
    },
  ],
  output: [
    { key: "response", type: "object", label: "Raw response body (undocumented shape)" },
  ],

  async execute(input, ctx) {
    const tags = input.tags
      ? input.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    const response = await requestInvitations(
      ctx,
      `/business-units/${encodeURIComponent(input.businessUnitId)}/email-invitations`,
      {
        method: "POST",
        body: {
          type: "email",
          locale: input.locale,
          consumerEmail: input.consumerEmail,
          consumerName: input.consumerName,
          referenceNumber: input.referenceNumber,
          senderName: input.senderName,
          senderEmail: input.senderEmail,
          replyTo: input.replyTo,
          locationId: input.locationId,
          serviceReviewInvitation: {
            templateId: input.templateId,
            preferredSendTime: input.preferredSendTime,
            redirectUri: input.redirectUri,
            tags,
          },
        },
      },
    );
    return { response };
  },
};

export default invitationSendEmail;
