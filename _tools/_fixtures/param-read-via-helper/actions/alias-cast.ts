import type { ActionDefinition } from "@w6w/types";

/**
 * Exemption shape (iii): alias tracking — `const p = input as
 * Record<string, unknown>` then `p.siteId`, the exact shape of
 * `apps/netlify/actions/site-get.ts:26-27`. `execute` never writes
 * `input.siteId` — only `p.siteId` — so alias tracking is what keeps this
 * from a false `param/unread`.
 */
const aliasCast: ActionDefinition = {
  key: "alias-cast",
  type: "read",
  resource: "thing",
  title: "Alias Cast",
  description: "Fixture action reading its input through a cast alias.",
  params: [
    { key: "siteId", label: "Site ID", type: "string", required: true },
  ],
  execute(input, _ctx) {
    const p = input as Record<string, unknown>;
    return { siteId: String(p.siteId ?? "") };
  },
};

export default aliasCast;
