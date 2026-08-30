import type { ActionDefinition } from "@w6w/types";
import { domainIdParam } from "../lib/params.ts";
import { encodeId, UnbounceClient } from "../lib/client.ts";

interface Input {
  domainId: string;
}

const domainGet: ActionDefinition<Input> = {
  key: "domain-get",
  type: "read",
  resource: "domain",
  title: "Get Domain",
  description: "Retrieve a custom domain that has been registered with Unbounce.",
  params: [domainIdParam],
  output: [
    { key: "id", type: "string", label: "Domain ID" },
    { key: "name", type: "string", label: "Domain name" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get(`/domains/${encodeId(input.domainId)}`);
  },
};

export default domainGet;
