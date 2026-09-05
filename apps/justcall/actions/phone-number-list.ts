import type { ActionDefinition } from "@w6w/types";
import { JustCallClient } from "../lib/client.ts";
import { PAGE, PAGINATION_OUTPUT, perPage } from "../lib/params.ts";

/**
 * `GET /v2.1/phone-numbers` — verified against `phone_number_list_v21`'s
 * OpenAPI fragment, 2026-09-05.
 *
 * `order`'s enum is `["ASC", "DESC"]` here — **uppercase**, unlike every other
 * list endpoint in this app (`calls`, `contacts`, `users` all use lowercase
 * `asc`/`desc`). Sent verbatim as documented rather than normalised, since
 * normalising would silently break the one endpoint that actually wants
 * uppercase.
 */
interface Input {
  availability_setting?: string;
  capabilities?: string;
  justcall_line_name?: string;
  number_owner_id?: number;
  number_type?: string;
  order?: string;
  page?: number;
  per_page?: number;
  shared_agent_id?: number;
  shared_group_id?: number;
}

const phoneNumberList: ActionDefinition<Input> = {
  key: "phone-number-list",
  type: "search",
  resource: "phone-number",
  title: "List Phone Numbers",
  description: "Fetch the phone numbers added to the account, optionally filtered.",
  params: [
    {
      key: "availability_setting",
      label: "Availability setting",
      type: "select",
      options: [
        { label: "Always Open", value: "Always Open" },
        { label: "Always Closed", value: "Always Closed" },
        { label: "Custom Hours", value: "Custom Hours" },
      ],
    },
    {
      key: "capabilities",
      label: "Capability",
      type: "select",
      options: [
        { label: "Call", value: "call" },
        { label: "SMS", value: "sms" },
        { label: "MMS", value: "mms" },
      ],
    },
    { key: "justcall_line_name", label: "Line name", type: "string" },
    { key: "number_owner_id", label: "Owner agent ID", type: "number" },
    {
      key: "number_type",
      label: "Number type",
      type: "select",
      options: [
        { label: "Local", value: "local" },
        { label: "Mobile", value: "mobile" },
        { label: "Toll-free", value: "toll_free" },
      ],
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [{ label: "Descending", value: "DESC" }, { label: "Ascending", value: "ASC" }],
      hint: "Sent uppercase — this endpoint's own documented enum, unlike calls/contacts/users.",
    },
    PAGE,
    perPage(30, 100),
    { key: "shared_agent_id", label: "Shared with agent ID", type: "number" },
    { key: "shared_group_id", label: "Shared with group ID", type: "number" },
  ],
  output: PAGINATION_OUTPUT,

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    const { body } = await client.json("/phone-numbers", {
      query: {
        availability_setting: input.availability_setting,
        capabilities: input.capabilities,
        justcall_line_name: input.justcall_line_name,
        number_owner_id: input.number_owner_id,
        number_type: input.number_type,
        order: input.order,
        page: input.page,
        per_page: input.per_page,
        shared_agent_id: input.shared_agent_id,
        shared_group_id: input.shared_group_id,
      },
    });
    return body;
  },
};

export default phoneNumberList;
