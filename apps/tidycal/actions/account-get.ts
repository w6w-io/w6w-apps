import type { ActionDefinition } from "@w6w/types";
import { TidyCalClient } from "../lib/client.ts";

/**
 * `GET /api/me` — who this connection belongs to.
 *
 * Seven fields, and not one of them is sensitive beyond the account holder's own
 * identity: `name`, `email`, `lifetime_pro_at`, `vanity_path`, `language`,
 * `profile_picture_url`, `currency_symbol`. That is unusual enough to be worth
 * stating — a vendor whoami returning the caller's own key is a real pattern
 * (Mailjet's `/apikey`, Follow Up Boss's `/me`) and is why this app's health
 * probe was chosen by reading this schema rather than by the endpoint's name.
 *
 * The response is the **bare `User` entity**, not `{"data": …}`.
 *
 * `vanity_path` is the useful one: it is the `<you>` in
 * `tidycal.com/<you>/<slug>`, so it is what turns a booking type's slug into a
 * shareable link. `lifetime_pro_at` is the account's lifetime-plan timestamp,
 * the nearest thing there is to a signal for the `402` on Create contact.
 */
type Input = Record<string, never>;

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get account",
  description: "Fetch the connected TidyCal account's profile.",
  params: [],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "vanity_path", type: "string", label: "Vanity path" },
    { key: "language", type: "string", label: "Language" },
    { key: "currency_symbol", type: "string", label: "Currency symbol" },
    { key: "lifetime_pro_at", type: "string", label: "Lifetime plan since" },
    { key: "profile_picture_url", type: "string", label: "Profile picture URL" },
  ],

  execute(_input, ctx) {
    return new TidyCalClient(ctx).json("/me");
  },
};

export default accountGet;
