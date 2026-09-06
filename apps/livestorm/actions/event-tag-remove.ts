import type { ActionDefinition } from "@w6w/types";
import { buildBody, LivestormClient } from "../lib/client.ts";

interface Input {
  id: string;
  title: string;
}

const eventTagRemove: ActionDefinition<Input> = {
  key: "event-tag-remove",
  type: "perform",
  resource: "event",
  title: "Remove Tag from Event",
  description:
    "Unassign a tag from an event by title. Per the vendor's own docs this does NOT delete " +
    "the tag itself from the workspace, only the assignment.",
  idempotent: true,
  params: [
    { key: "id", label: "Event ID", type: "string", required: true },
    { key: "title", label: "Tag title", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const body = buildBody("tags", { title: input.title });
    const status = await new LivestormClient(ctx).status(
      `/events/${encodeURIComponent(input.id)}/tags`,
      { method: "DELETE", body },
    );
    return { status };
  },
};

export default eventTagRemove;
