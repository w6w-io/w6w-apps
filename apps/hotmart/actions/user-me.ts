import type { ActionDefinition } from "@w6w/types";
import { HotmartClient, USER_PREFIX } from "../lib/client.ts";

/**
 * `GET /user/api/v1/me` — verified against
 * `developers.hotmart.com/docs/en/v1/user/get-user-me/` on 2026-09-05. Takes
 * no query or body parameters. Returns the authenticated producer's own
 * profile: name, email, address, locale, timezone and commission currency.
 */
type Input = Record<string, never>;

const userMe: ActionDefinition<Input> = {
  key: "user-me",
  type: "read",
  title: "Get My Profile",
  description: "Get the authenticated user's own profile: name, email, address, locale, timezone.",
  resource: "user",
  params: [],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "login", type: "string", label: "Login" },
    { key: "ucode", type: "string", label: "User UUID" },
    { key: "address", type: "object", label: "Address" },
    { key: "entity_type", type: "string", label: "Entity type" },
    { key: "locale", type: "string", label: "Locale" },
    { key: "time_zone", type: "string", label: "Time zone" },
    { key: "currency_code_commission", type: "string", label: "Commission currency" },
  ],

  async execute(_input, ctx) {
    const client = new HotmartClient(ctx);
    return await client.json(`${USER_PREFIX}/me`);
  },
};

export default userMe;
