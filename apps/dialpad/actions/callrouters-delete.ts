import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /api/v2/callrouters/{id}` — delete an API call router.
 *
 * The only delete in this app whose 200 response carries no schema/body in
 * the vendor's own OpenAPI document (every other delete here returns the
 * deleted entity) — confirmed by reading the spec's `responses` block, not
 * assumed. Status-only.
 */
interface Input {
  callRouterId: string;
}

const callroutersDelete: ActionDefinition<Input> = {
  key: "callrouters-delete",
  type: "perform",
  resource: "callrouter",
  title: "Delete Call Router",
  description: "Delete an API call router by id.",
  idempotent: true,
  params: [
    { key: "callRouterId", label: "Call Router ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new DialpadClient(ctx).status(
      `/callrouters/${encodeId(input.callRouterId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default callroutersDelete;
