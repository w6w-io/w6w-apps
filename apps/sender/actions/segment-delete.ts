import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `DELETE /v2/segments/{id}` — deletes a segment. */
interface Input {
  id: string;
}

const segmentDelete: ActionDefinition<Input> = {
  key: "segment-delete",
  type: "perform",
  resource: "segment",
  title: "Delete Segment",
  description: "Delete a segment.",
  idempotent: true,
  params: [{ key: "id", label: "Segment ID", type: "string", required: true }],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/segments/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default segmentDelete;
