import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient, type ClickSendPage, compact } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
}

export interface EmailAddressRow {
  email_address_id?: number;
  email_address?: string;
  verified?: number;
  date_added?: string;
}

/**
 * `GET /email/addresses` — list allowed "From" email addresses.
 *
 * `send-email` needs a numeric `fromEmailAddressId`, not a raw address — this is
 * how to find it. Only rows with `verified: 1` can actually send; ClickSend
 * requires clicking a confirmation link (or verifying DNS for a domain) before an
 * address moves out of `verified: 0`, which this app does not automate (see
 * README "Not built").
 */
const emailAddressList: ActionDefinition<Input> = {
  key: "email-address-list",
  type: "read",
  resource: "email",
  title: "List Email Addresses",
  description:
    "List verified sender addresses for Send Transactional Email (GET /email/addresses).",
  params: [
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "limit", label: "Limit", type: "number", default: 15, hint: "Min 15, max 100." },
  ],
  output: [
    { key: "addresses", type: "array", label: "Email addresses" },
    { key: "total", type: "number", label: "Total addresses" },
  ],

  async execute(input, ctx) {
    const client = new ClickSendClient(ctx);
    const page = await client.data<ClickSendPage<EmailAddressRow>>("/email/addresses", {
      query: compact({ page: input.page, limit: input.limit }),
    });
    return { addresses: page.data ?? [], total: page.total };
  },
};

export default emailAddressList;
