import type { ActionDefinition } from "@w6w/types";
import { DripClient } from "../lib/client.ts";

interface Input {
  email: string;
  tag: string;
}

const applyTag: ActionDefinition<Input> = {
  key: "apply-tag",
  type: "perform",
  resource: "tag",
  title: "Apply Tag",
  description: "Apply a tag to a subscriber. Creates the subscriber if they don't yet exist.",
  // Applying the same tag twice leaves the subscriber in the same state.
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "tag", label: "Tag", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Applied" }],

  async execute(input, ctx) {
    // Responds 201 Created with an empty `{}` body.
    await new DripClient(ctx).request("/tags", {
      method: "POST",
      body: { tags: [{ email: input.email, tag: input.tag }] },
    });
    return { success: true };
  },
};

export default applyTag;
