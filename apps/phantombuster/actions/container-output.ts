import type { ActionDefinition } from "@w6w/types";
import { containerIdParam } from "../lib/params.ts";
import { PhantomBusterClient } from "../lib/client.ts";

/**
 * `GET /containers/fetch-output` — a container's console output.
 *
 * The vendor documents three distinct outcomes for this endpoint: `200` with
 * `{output}`, `204` ("Container output is empty"), and `404` ("No container
 * exists with the provided id"). All three are reported here rather than the
 * 404 being thrown as a generic failure, since the vendor treats it as a
 * documented, expected shape of this specific read.
 *
 * `mode=raw` is deliberately not exposed. The vendor's own parameter
 * description says it returns the output "as plain text" instead of JSON, but
 * the OpenAPI schema still types the `200` response as `application/json` —
 * this app's client always parses the body as JSON (see `lib/client.ts`), and
 * there is no documented way to know in advance which content type a given
 * call will answer with. Rather than guess, this action only ever requests the
 * default (`json`) mode, which is unambiguous.
 */
interface Input {
  id: string;
}

const containerOutput: ActionDefinition<Input> = {
  key: "container-output",
  type: "read",
  title: "Get Container Output",
  description: "Get a container's console output.",
  params: [containerIdParam],
  output: [
    { key: "found", type: "boolean", label: "Container exists" },
    { key: "output", type: "string", label: "Console output" },
  ],

  async execute(input, ctx) {
    const client = new PhantomBusterClient(ctx);
    const { status, body } = await client.getRaw<{ output?: string | null }>(
      "/containers/fetch-output",
      [204, 404],
      { query: { id: input.id } },
    );
    if (status === 404) return { found: false, output: undefined };
    if (status === 204) return { found: true, output: undefined };
    return { found: true, output: body?.output ?? undefined };
  },
};

export default containerOutput;
