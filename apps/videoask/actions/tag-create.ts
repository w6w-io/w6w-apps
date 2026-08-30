import type { ActionDefinition } from "@w6w/types";
import { VideoAskClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/** `POST /tags` — create a new tag. Body: `{"title": "..."}`. */
interface Input {
  title: string;
  organizationId?: string;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a new tag.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    organizationIdParam,
  ],
  output: [
    { key: "tag_id", type: "string", label: "Tag ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return new VideoAskClient(ctx).entity("/tags", {
      method: "POST",
      body: { title: input.title },
      organizationId: input.organizationId,
    });
  },
};

export default tagCreate;
