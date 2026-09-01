import type { ActionDefinition } from "@w6w/types";
import { PhantomBusterClient } from "../lib/client.ts";

/**
 * `GET /orgs/fetch-resources` — the current organization's daily/monthly
 * resource headroom and plan ceilings. No secret-bearing fields are
 * documented on this endpoint. See `health/quota.ts` for the same read used
 * as this app's quota health check, including the documented assumption about
 * which direction these numbers read.
 */
type Input = Record<string, never>;

const orgResourcesGet: ActionDefinition<Input> = {
  key: "org-resources-get",
  type: "read",
  title: "Get Organization Resources",
  description:
    "Get the current organization's daily/monthly execution time, mail/captcha/discovered-mail/" +
    "AI/SERP credits, S3 storage and plan ceilings.",
  params: [],
  output: [{ key: "resources", type: "object", label: "Resources" }],

  async execute(_input, ctx) {
    const client = new PhantomBusterClient(ctx);
    const resources = await client.get("/orgs/fetch-resources");
    return { resources };
  },
};

export default orgResourcesGet;
