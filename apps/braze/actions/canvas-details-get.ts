import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/** `GET /canvas/details` — verified against the fetched spec. */
const action: ActionDefinition = {
  key: "canvas-details-get",
  type: "read",
  resource: "canvas",
  title: "Get Canvas Details",
  description: "Fetch full configuration and step details for one Canvas.",
  params: [
    { key: "canvasId", label: "Canvas ID", type: "string", required: true },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "steps", type: "array", label: "Steps" },
  ],

  async execute(input, ctx) {
    const p = input as { canvasId: string };
    return await new BrazeClient(ctx).get("/canvas/details", { canvas_id: p.canvasId });
  },
};

export default action;
