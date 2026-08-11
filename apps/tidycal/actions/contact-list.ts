import type { ActionDefinition } from "@w6w/types";
import { TidyCalClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

/**
 * `GET /api/contacts` — everyone who has ever booked with this account.
 *
 * Worth knowing what this returns before piping it anywhere: TidyCal's `Contact`
 * schema carries `name`, `email`, `phone_number` **and `ip_address`** — the
 * booker's IP, captured at booking time. That is personal data about third
 * parties, not about the connected account, which is why no health check in this
 * app reads this endpoint even though it would work as a liveness probe.
 *
 * There is no single-contact read: `/api/contacts/1` answers `404 {"message":
 * "The route api/contacts/1 could not be found."}` (measured 2026-08-11).
 */
interface Input {
  page?: number;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List contacts",
  description: "List the account's contacts. Includes each contact's captured IP address.",
  params: [pageParam],
  output: [{ key: "data", type: "array", label: "Contacts" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json("/contacts", { query: { page: input.page } });
  },
};

export default contactList;
