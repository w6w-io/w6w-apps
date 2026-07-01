import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient, type MailchimpListResponse } from "../lib/client.ts";

interface Input {
  listId: string;
  categoryId: string;
  count?: number;
  offset?: number;
}

/**
 * List the individual "interests" that belong to a given interest category
 * inside a list. Ports n8n's `listGroup:getAll`.
 *
 * Mailchimp terminology is confusing: an audience (list) has interest
 * *categories* (a group), and each category has interest *records* (a
 * checkbox / radio option). This action returns the leaf interests.
 */
const listGroupInterests: ActionDefinition<Input> = {
  key: "list-group-interests",
  type: "read",
  resource: "list-group",
  title: "List Group Interests",
  description: "List the interests inside a list's interest category.",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    { key: "categoryId", label: "Interest category ID", type: "string", required: true },
    { key: "count", label: "Count", type: "number", default: 500 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "interests", type: "array", label: "Interests" },
    { key: "total_items", type: "number", label: "Total items" },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    return client.request<MailchimpListResponse<"interests">>(
      `/lists/${input.listId}/interest-categories/${input.categoryId}/interests`,
      {
        query: {
          count: input.count ?? 500,
          offset: input.offset ?? 0,
        },
      },
    );
  },
};

export default listGroupInterests;
