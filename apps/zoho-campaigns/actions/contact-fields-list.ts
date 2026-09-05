import type { ActionDefinition } from "@w6w/types";
import { unwrapEnvelope, ZohoCampaignsClient } from "../lib/client.ts";

interface Output {
  fields: Array<Record<string, unknown>>;
}

/**
 * `GET /contact/allfields` — verified against
 * `https://www.zoho.com/campaigns/help/developers/get-contact-fields.html`.
 *
 * Two quirks unique to this endpoint (and to `contact-field-create`, its
 * sibling):
 *   - The format parameter is `type=json`, not `resfmt=JSON` — see
 *     `lib/client.ts`'s module doc.
 *   - The success payload is nested one level deeper, under a `"response"`
 *     key (`{"response": {"code": "0", "fieldname": [...]}}`), unlike every
 *     other endpoint in this app, which inlines its payload at the top
 *     level.
 */
const contactFieldsList: ActionDefinition<Record<string, never>, Output> = {
  key: "contact-fields-list",
  type: "read",
  resource: "contact",
  title: "List Contact Fields",
  description:
    "List every contact field defined on this Zoho Campaigns account, custom or built-in.",
  params: [],
  output: [{ key: "fields", type: "array", label: "Contact fields" }],

  async execute(_input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<Record<string, unknown>>(
      "contact/allfields",
      { formatParam: "type" },
    );
    const envelope = unwrapEnvelope<{ fieldname?: Array<Record<string, unknown>> }>(body);
    return { fields: envelope.fieldname ?? [] };
  },
};

export default contactFieldsList;
