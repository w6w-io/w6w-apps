import type { ActionDefinition } from "@w6w/types";
import { compact, JudgeMeClient } from "../lib/client.ts";

/**
 * `PUT /shops` — Update current shop.
 *
 * Another operation where the document's own schema is broken: the request
 * body's declared `schema` is `{type: "string"}`, while the accompanying
 * `example` is a full object (`domain`, `custom_domain`, `email`, `owner`,
 * `phone`, `name`, `country`, `timezone`, `plan`). The example is followed
 * here since a bare string cannot carry any of those fields at all. The
 * response is the same undocumented `success_200` empty schema used by
 * `get-shop-info`, so the raw body is returned as-is.
 */
interface Input {
  domain?: string;
  customDomain?: string;
  email?: string;
  owner?: string;
  phone?: string;
  name?: string;
  country?: string;
  timezone?: string;
  plan?: string;
}

const updateShop: ActionDefinition<Input> = {
  key: "update-shop",
  type: "perform",
  resource: "shop",
  title: "Update Shop",
  description:
    "Update the connected store's Judge.me-held information (domain, owner, contact info, " +
    "country, timezone, plan). Only the fields provided are sent.",
  idempotent: true,
  params: [
    { key: "domain", label: "Domain", type: "string" },
    { key: "customDomain", label: "Custom Domain", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "owner", label: "Owner", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "name", label: "Shop Name", type: "string" },
    { key: "country", label: "Country", type: "string", hint: "ISO 3166-1 alpha-2, e.g. US." },
    { key: "timezone", label: "Timezone", type: "string" },
    { key: "plan", label: "Plan", type: "string" },
  ],
  output: [
    { key: "result", type: "object", label: "Raw response body (shape undocumented by Judge.me)" },
  ],

  async execute(input, ctx) {
    const result = await new JudgeMeClient(ctx).json<Record<string, unknown>>("/shops", {
      method: "PUT",
      body: compact({
        domain: input.domain,
        custom_domain: input.customDomain,
        email: input.email,
        owner: input.owner,
        phone: input.phone,
        name: input.name,
        country: input.country,
        timezone: input.timezone,
        plan: input.plan,
      }),
    });
    return { result };
  },
};

export default updateShop;
