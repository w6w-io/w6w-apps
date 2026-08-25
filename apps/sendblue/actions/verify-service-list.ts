import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v2/verify/services`. */
const verifyServiceList: ActionDefinition<Input> = {
  key: "verify-service-list",
  type: "search",
  resource: "verify-service",
  title: "List Verify Services",
  description: "List Verify services on this account.",
  params: [],
  output: [
    { key: "services", type: "array", label: "Services" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  execute(_input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get("/api/v2/verify/services");
  },
};

export default verifyServiceList;
