import type { ActionDefinition } from "@w6w/types";
import { VideoAskClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/**
 * `GET /brandings` — every brand (custom logo/domain/colors) in the account.
 * Confirmed `{count, next, previous, results}` envelope. Each result's
 * top-level `id` field is documented by the vendor as deprecated in favor of
 * `branding_id` — both are returned verbatim here rather than dropping one.
 */
interface Input {
  organizationId?: string;
}

const brandingList: ActionDefinition<Input> = {
  key: "branding-list",
  type: "read",
  resource: "branding",
  title: "List Brands",
  description: "List all brands (custom logo, domain and colors) in the account.",
  params: [organizationIdParam],
  output: [
    { key: "count", type: "number", label: "Total brand count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Brands" },
  ],

  execute(input, ctx) {
    return new VideoAskClient(ctx).list("/brandings", { organizationId: input.organizationId });
  },
};

export default brandingList;
