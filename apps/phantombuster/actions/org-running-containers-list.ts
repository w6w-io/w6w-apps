import type { ActionDefinition } from "@w6w/types";
import { PhantomBusterClient } from "../lib/client.ts";

/**
 * `GET /orgs/fetch-running-containers` — every container currently running
 * across the whole organization, across all agents. Useful for a
 * dashboard/guard step before launching more work.
 */
type Input = Record<string, never>;

const orgRunningContainersList: ActionDefinition<Input> = {
  key: "org-running-containers-list",
  type: "read",
  title: "List Running Containers",
  description: "List every container currently running across the organization.",
  params: [],
  output: [{ key: "containers", type: "array", label: "Running containers" }],

  async execute(_input, ctx) {
    const client = new PhantomBusterClient(ctx);
    return await client.get("/orgs/fetch-running-containers");
  },
};

export default orgRunningContainersList;
