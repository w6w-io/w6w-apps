import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Sender actions.
 *
 * Copied from the vendor's own documentation pages (`api.sender.net`), fetched
 * 2026-09-05, not inferred from a third-party directory.
 */

/**
 * The `?page` / `?limit` / `?order` / `?direction` parameters documented at
 * `api.sender.net/pagination/`, shared by every list endpoint.
 *
 * Sender's own worked example turns `GET /v2/campaigns` into
 * `?page=5&limit=20&order=modified&direction=desc` — `order` accepts "the key
 * values from the resource data", so it is left as free text rather than a
 * fixed enum: the valid set differs per resource and the docs do not enumerate
 * it per endpoint.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Which page of results to return.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "How many records per page.",
    },
    {
      key: "order",
      label: "Order by",
      type: "string",
      hint: "A field key from the resource's own data (e.g. `modified`, `created`).",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending (default)" },
      ],
    },
  ];
}

export interface PaginationInput {
  page?: number;
  limit?: number;
  order?: string;
  direction?: string;
}

export function paginationQuery(
  input: PaginationInput,
): Record<string, string | number | undefined> {
  return {
    page: input.page,
    limit: input.limit,
    order: input.order,
    direction: input.direction,
  };
}

/**
 * `{email}or{phone}or{ID}` — Sender addresses one subscriber three ways on the
 * same path segment (`GET/PATCH /v2/subscribers/{email}or{phone}or{ID}`).
 */
export const subscriberIdentifierParam: Param = {
  key: "identifier",
  label: "Email, phone, or ID",
  type: "string",
  required: true,
  hint: "The subscriber's email address, phone number, or Sender subscriber ID.",
};

/** `custom field` type enum: create-field only accepts these three. */
export const fieldTypeOptions = [
  { value: "number", label: "Number" },
  { value: "text", label: "Text" },
  { value: "datetime", label: "Date/time" },
];

/** `ACTIVE | UNSUBSCRIBED | BOUNCED | SPAM_REPORTED` — subscriber channel status. */
export const subscriberStatusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "UNSUBSCRIBED", label: "Unsubscribed" },
  { value: "BOUNCED", label: "Bounced" },
  { value: "SPAM_REPORTED", label: "Spam reported" },
];

/** `opened | bounced | clicked | unsubscribed | got` — subscriber event actions. */
export const subscriberEventActionOptions = [
  { value: "got", label: "Got (received)" },
  { value: "opened", label: "Opened" },
  { value: "clicked", label: "Clicked" },
  { value: "bounced", label: "Bounced" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

/** `SCHEDULED | SENDING | SENT | DRAFT` — campaign status filter. */
export const campaignStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "SENDING", label: "Sending" },
  { value: "SENT", label: "Sent" },
];
