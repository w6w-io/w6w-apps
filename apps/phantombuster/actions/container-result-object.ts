import type { ActionDefinition } from "@w6w/types";
import { containerIdParam } from "../lib/params.ts";
import { PhantomBusterClient } from "../lib/client.ts";

/**
 * `GET /containers/fetch-result-object` — the result object a container's
 * agent script set via `buster.setResultObject()`. The vendor types it as a
 * plain nullable string, not structured JSON — an agent script can call
 * `setResultObject` with anything, so this returns the raw string verbatim
 * rather than assuming it is always JSON-encoded.
 */
interface Input {
  id: string;
}

const containerResultObject: ActionDefinition<Input> = {
  key: "container-result-object",
  type: "read",
  title: "Get Container Result Object",
  description: "Get the result object a container's agent set via buster.setResultObject().",
  params: [containerIdParam],
  output: [
    { key: "found", type: "boolean", label: "Container exists" },
    { key: "resultObject", type: "string", label: "Result object (raw string)" },
  ],

  async execute(input, ctx) {
    const client = new PhantomBusterClient(ctx);
    const { status, body } = await client.getRaw<{ resultObject?: string | null }>(
      "/containers/fetch-result-object",
      [404],
      { query: { id: input.id } },
    );
    if (status === 404) return { found: false, resultObject: undefined };
    return { found: true, resultObject: body?.resultObject ?? undefined };
  },
};

export default containerResultObject;
