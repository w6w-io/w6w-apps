import type { ActionDefinition } from "@w6w/types";
import { TapfiliateClient } from "../lib/client.ts";

/**
 * `POST /affiliate-groups/`
 *
 * Same gap as `affiliate-group-set`: no "Arguments" prose is rendered for
 * this endpoint. The body field, `title`, comes from the page's own code
 * sample (`body: {title: '<ADD STRING VALUE>'}`), matching the `title` field
 * on every affiliate-group object shown elsewhere in the docs.
 */
interface Input {
  title: string;
}

const affiliateGroupCreate: ActionDefinition<Input> = {
  key: "affiliate-group-create",
  type: "perform",
  resource: "affiliate-group",
  title: "Create Affiliate Group",
  description: "Create a new affiliate group.",
  idempotent: false,
  params: [{ key: "title", label: "Title", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "New group id" },
    { key: "title", type: "string", label: "Title" },
    { key: "affiliate_count", type: "number", label: "Members — 0 for a new group" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json("/affiliate-groups/", {
      method: "POST",
      body: { title: input.title },
    });
  },
};

export default affiliateGroupCreate;
