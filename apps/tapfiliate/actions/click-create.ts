import type { ActionDefinition } from "@w6w/types";
import { compact, TapfiliateClient } from "../lib/client.ts";

/**
 * `POST /clicks/`
 *
 * For a REST-only integration (no Tapfiliate JS snippet on the site): create
 * a click record here to get a click id, then pass that id as `clickId` to
 * `customer-create` or `conversion-create` to attribute them to it. Unlike
 * `click-list`/`click-get`, this endpoint carries no "Enterprise plan only"
 * note in the docs.
 */
interface Input {
  referralCode: string;
  sourceId?: string;
  metaData?: unknown;
  referrer?: string;
  landingPage?: string;
  userAgent?: string;
  ip?: string;
}

const clickCreate: ActionDefinition<Input> = {
  key: "click-create",
  type: "perform",
  resource: "click",
  title: "Create Click",
  description:
    "Record a click for an affiliate's referral code, returning a click id to attribute a later conversion to.",
  idempotent: false,
  params: [
    {
      key: "referralCode",
      label: "Referral code",
      type: "string",
      required: true,
      hint: "The affiliate's referral code, obtained from the ref= query parameter of their link.",
    },
    { key: "sourceId", label: "Source id", type: "string" },
    {
      key: "metaData",
      label: "Meta data",
      type: "json",
      hint: '{"key": "value"}. Multiple keys allowed.',
    },
    { key: "referrer", label: "HTTP referrer", type: "string" },
    { key: "landingPage", label: "Landing page", type: "string" },
    { key: "userAgent", label: "User agent", type: "string" },
    { key: "ip", label: "IP address", type: "string" },
  ],
  output: [{ key: "id", type: "string", label: "New click id" }],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json("/clicks/", {
      method: "POST",
      body: compact({
        referral_code: input.referralCode,
        source_id: input.sourceId,
        meta_data: input.metaData,
        referrer: input.referrer,
        landing_page: input.landingPage,
        user_agent: input.userAgent,
        ip: input.ip,
      }),
    });
  },
};

export default clickCreate;
