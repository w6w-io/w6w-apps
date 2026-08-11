import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/emails` — List sent Emails.
 *
 * The only way to see what Send Email actually did: that endpoint answers 202
 * with no body, so this is where the record shows up.
 *
 * The date clauses are named `start_created_time` / `end_created_time` here —
 * not the `start_update_time` / `end_update_time` of contacts, nor the
 * `since_time` / `until_time` of tasks, nor the `created_since_time` /
 * `created_until_time` of orders. Four resources, four spellings of the same
 * idea; each action states its own.
 */
interface Input {
  contactId?: string;
  email?: string;
  sinceCreatedTime?: string;
  untilCreatedTime?: string;
  filter?: string;
  orderBy?: string;
  pageSize?: number;
  pageToken?: string;
}

const emailList: ActionDefinition<Input> = {
  key: "email-list",
  type: "search",
  title: "List Sent Emails",
  resource: "email",
  description: "List emails Keap has recorded, by contact, address or send window.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string" },
    { key: "email", label: "Recipient address", type: "string" },
    { key: "sinceCreatedTime", label: "Sent since", type: "datetime" },
    { key: "untilCreatedTime", label: "Sent until", type: "datetime" },
    filterParam,
    orderByParam("`created_time` is the only sort field, plus `asc` or `desc`."),
    ...pageParams(),
  ],
  output: [
    { key: "emails", type: "array", label: "Emails" },
    { key: "count", type: "number", label: "Emails returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([
      eq("contact_id", input.contactId),
      eq("email", input.email),
      eq("start_created_time", input.sinceCreatedTime),
      eq("end_created_time", input.untilCreatedTime),
      input.filter,
    ]);
    const client = new KeapClient(ctx);
    const body = await client.json<{ emails?: unknown[]; next_page_token?: string }>(
      `${V2}/emails`,
      {
        query: {
          filter,
          order_by: input.orderBy,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );
    const emails = body?.emails ?? [];
    return { emails, count: emails.length, nextPageToken: nextPageToken(body) };
  },
};

export default emailList;
