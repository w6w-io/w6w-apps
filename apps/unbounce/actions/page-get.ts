import type { ActionDefinition } from "@w6w/types";
import { encodeId, UnbounceClient } from "../lib/client.ts";
import { pageIdParam } from "../lib/params.ts";

/**
 * `GET /pages/{page_id}` — a single page, including its A/B test stats
 * (`tests.current`): champion/winner/loser variant, visits, conversions and
 * conversion rate, when the page is running a test.
 */
interface Input {
  pageId: string;
}

const pageGet: ActionDefinition<Input> = {
  key: "page-get",
  type: "read",
  resource: "page",
  title: "Get Page",
  description: "Retrieve a single page's metadata, publish state, and current A/B test stats.",
  params: [pageIdParam],
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "url", type: "string", label: "Published URL" },
    { key: "state", type: "string", label: "State (published or unpublished)" },
    { key: "sub_account_id", type: "string", label: "Owning Sub-Account ID" },
    { key: "tests", type: "object", label: "Current A/B test stats, if any" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(`/pages/${encodeId(input.pageId)}`);
  },
};

export default pageGet;
