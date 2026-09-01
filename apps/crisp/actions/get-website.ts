import type { ActionDefinition } from "@w6w/types";
import { CrispClient } from "../lib/client.ts";

type Input = Record<string, never>;

export interface CrispWebsite {
  website_id?: string;
  name?: string;
  domain?: string;
  logo?: string;
  verified?: boolean;
  institutional?: boolean;
}

/**
 * `GET /v1/website/{website_id}` — resolves the connected workspace's own
 * information. Field names verified against the reference's embedded
 * response sample (`error/reason/data` envelope with `website_id`, `name`,
 * `domain`, `logo`, `verified`, `institutional`) — the same probe
 * `auth/basic.ts`'s `test` hook uses.
 */
const getWebsite: ActionDefinition<Input, CrispWebsite | undefined> = {
  key: "get-website",
  type: "read",
  resource: "website",
  title: "Get Website",
  description: "Resolves information about the connected Crisp workspace.",
  params: [],
  output: [
    { key: "website_id", type: "string", label: "Website ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "domain", type: "string", label: "Domain" },
    { key: "logo", type: "string", label: "Logo URL" },
    { key: "verified", type: "boolean", label: "Verified" },
    { key: "institutional", type: "boolean", label: "Institutional" },
  ],

  execute(_input, ctx) {
    const client = new CrispClient(ctx);
    return client.request<CrispWebsite>("");
  },
};

export default getWebsite;
