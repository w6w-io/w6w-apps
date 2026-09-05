import type { ActionDefinition } from "@w6w/types";
import { OneSignalClient, resolveAppId } from "../lib/client.ts";

interface Input {
  segmentId: string;
}

/**
 * `DELETE /apps/{app_id}/segments/{segment_id}` — verified against the
 * OpenAPI document. Deletes the Segment only; users that were in it are
 * untouched.
 */
const deleteSegment: ActionDefinition<Input> = {
  key: "delete-segment",
  type: "perform",
  resource: "segment",
  title: "Delete Segment",
  description: "Delete a Segment. Does not delete users or subscriptions in it.",
  idempotent: true,
  params: [
    { key: "segmentId", label: "Segment ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Deleted" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    return new OneSignalClient(ctx).json(
      `/apps/${encodeURIComponent(appId)}/segments/${encodeURIComponent(input.segmentId)}`,
      { method: "DELETE" },
    );
  },
};

export default deleteSegment;
