import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient } from "../lib/client.ts";
import { viewOutput } from "../lib/params.ts";

interface Input {
  viewId: number;
}

/** `GET /views/{id}` — verified against developers.gorgias.com/reference/get-view. */
const viewGet: ActionDefinition<Input> = {
  key: "view-get",
  type: "read",
  resource: "view",
  title: "Get View",
  description: "Retrieve a single saved ticket view by ID.",
  params: [
    { key: "viewId", label: "View ID", type: "number", required: true },
  ],
  output: viewOutput,

  execute(input, ctx) {
    return new GorgiasClient(ctx).request(`/views/${input.viewId}`);
  },
};

export default viewGet;
