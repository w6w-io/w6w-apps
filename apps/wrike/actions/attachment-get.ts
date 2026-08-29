import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, joinIds, WrikeClient } from "../lib/client.ts";

/** `GET /attachments/{attachmentIds}` — one or more attachments' metadata by ID. */
interface Input {
  attachmentIds: string | string[];
  versions?: boolean;
}

const attachmentGet: ActionDefinition<Input> = {
  key: "attachment-get",
  type: "read",
  resource: "attachment",
  title: "Get Attachments by ID",
  description: "Fetch complete metadata for one or more attachments by ID.",
  params: [
    {
      key: "attachmentIds",
      label: "Attachment ID(s)",
      type: "string",
      required: true,
      hint: "One attachment ID, or several comma-separated.",
    },
    { key: "versions", label: "Include all versions", type: "boolean", advanced: true },
  ],
  output: [{ key: "items", type: "array", label: "Attachments" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const items = await new WrikeClient(ctx, host).list(
      `/attachments/${joinIds(input.attachmentIds)}`,
      { query: { versions: input.versions } },
    );
    return { items };
  },
};

export default attachmentGet;
