import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId, stripSignatureSecret } from "../lib/client.ts";

/**
 * `GET /api/v2/callrouters/{id}` — get one API call router by id.
 *
 * **Redacted.** See `lib/client.ts` for why `signature.secret` is stripped.
 */
interface Input {
  callRouterId: string;
}

const callroutersGet: ActionDefinition<Input> = {
  key: "callrouters-get",
  type: "read",
  resource: "callrouter",
  title: "Get Call Router",
  description: "Get an API call router by id.",
  params: [
    { key: "callRouterId", label: "Call Router ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Call router ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "routing_url", type: "string", label: "Routing URL" },
    { key: "enabled", type: "boolean", label: "Enabled" },
  ],

  async execute(input, ctx) {
    const router = await new DialpadClient(ctx).json(
      `/callrouters/${encodeId(input.callRouterId)}`,
    );
    return stripSignatureSecret(router);
  },
};

export default callroutersGet;
