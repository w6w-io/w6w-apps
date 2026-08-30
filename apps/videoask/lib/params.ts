import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the VideoAsk actions.
 *
 * Every field here is copied from the vendor's Postman collection (fetched
 * 2026-08-30), not inferred.
 */

/**
 * Most endpoints document `organization-id` as an OPTIONAL header: "allow[s]
 * accessing resources from different organizations where you also have proper
 * permissions." Left empty, VideoAsk uses the connection's default
 * organization.
 */
export const organizationIdParam: Param = {
  key: "organizationId",
  label: "Organization ID",
  type: "string",
  hint: "Optional. Scope this call to a specific organization you belong to, sent as the " +
    "organization-id header. Leave empty to use the account's default organization.",
};

export const formIdParam: Param = {
  key: "formId",
  label: "Form ID",
  type: "string",
  required: true,
  hint: "The form_id of the videoask, e.g. from a Retrieve All Forms result.",
};

export const questionIdParam: Param = {
  key: "questionId",
  label: "Question ID",
  type: "string",
  required: true,
  hint: "The question_id of a form step, e.g. from Retrieve Form By ID's questions array.",
};

export const contactIdParam: Param = {
  key: "contactId",
  label: "Contact ID",
  type: "string",
  required: true,
  hint: "The contact_id of a respondent's response to a form (aka respondent_id in some payloads).",
};

export const respondentIdParam: Param = {
  key: "respondentId",
  label: "Respondent ID",
  type: "string",
  required: true,
  hint: "The id of a contact created via Create Contact, or a contact_id from a form's responses.",
};

export const tagIdParam: Param = {
  key: "tagId",
  label: "Tag ID",
  type: "string",
  required: true,
};

/**
 * A WEBHOOK's own identifying `tag` — a caller-chosen (or VideoAsk-generated)
 * string embedded in the webhook's URL path. Unrelated to {@link tagIdParam},
 * which identifies a content/response tag.
 */
export const webhookTagParam: Param = {
  key: "webhookTag",
  label: "Webhook tag",
  type: "string",
  required: true,
  hint: 'A unique identifier for this webhook, e.g. "hubspot-webhook". If updating a webhook ' +
    "created via the VideoAsk web app, find its generated tag with List Webhooks.",
};

/**
 * `limit`/`offset` — VideoAsk's pagination pair. Present on every list
 * endpoint this app covers, though the vendor's own documented default varies
 * per endpoint and is sometimes unbounded; a small explicit default keeps a
 * first call cheap.
 */
export function paginationParams(defaultLimit: number): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 0 },
      hint: "Page size.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Number of results to skip.",
    },
  ];
}
