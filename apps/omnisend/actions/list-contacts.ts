import type { ActionDefinition } from "@w6w/types";
import { OmnisendClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  after?: string;
  before?: string;
  sort?: "createdAt" | "updatedAt";
  direction?: "asc" | "desc";
  email?: string;
  phone?: string;
  status?: "subscribed" | "unsubscribed" | "nonSubscribed";
  segmentID?: string;
  tag?: string;
  updatedAtFrom?: string;
}

/** https://api-docs.omnisend.com/reference/get_contacts */
const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts with cursor-based pagination and optional filters.",
  params: [
    { key: "limit", label: "Limit", type: "number", hint: "1-250. Default 100." },
    { key: "after", label: "Page cursor (next)", type: "string" },
    { key: "before", label: "Page cursor (previous)", type: "string" },
    {
      key: "sort",
      label: "Sort field",
      type: "select",
      options: [{ value: "createdAt", label: "Created at" }, {
        value: "updatedAt",
        label: "Updated at",
      }],
    },
    {
      key: "direction",
      label: "Sort direction",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    { key: "email", label: "Filter by email", type: "string" },
    { key: "phone", label: "Filter by phone", type: "string" },
    {
      key: "status",
      label: "Filter by subscription status",
      type: "select",
      hint: "Cannot be combined with `tag`.",
      options: [
        { value: "subscribed", label: "Subscribed" },
        { value: "unsubscribed", label: "Unsubscribed" },
        { value: "nonSubscribed", label: "Non-subscribed" },
      ],
    },
    { key: "segmentID", label: "Filter by segment ID", type: "string" },
    {
      key: "tag",
      label: "Filter by tag",
      type: "string",
      hint: "Cannot be combined with `status`.",
    },
    {
      key: "updatedAtFrom",
      label: "Updated at or after (RFC3339)",
      type: "string",
      hint: "Cannot be combined with email, phone, status, segmentID, or tag.",
    },
  ],

  execute(input, ctx) {
    const client = new OmnisendClient(ctx);
    return client.request(`/contacts`, {
      query: {
        limit: input.limit,
        after: input.after,
        before: input.before,
        sort: input.sort,
        direction: input.direction,
        email: input.email,
        phone: input.phone,
        status: input.status,
        segmentID: input.segmentID,
        tag: input.tag,
        updatedAtFrom: input.updatedAtFrom,
      },
    });
  },
};

export default listContacts;
