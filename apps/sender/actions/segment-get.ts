import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `GET /v2/segments/{id}` — a single segment's details, including its conditions. */
interface Input {
  id: string;
}

const segmentGet: ActionDefinition<Input> = {
  key: "segment-get",
  type: "read",
  resource: "segment",
  title: "Get Segment",
  description: "Get a segment's details, including its filter conditions.",
  params: [{ key: "id", label: "Segment ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Segment ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/segments/${encodeURIComponent(input.id)}`);
  },
};

export default segmentGet;
