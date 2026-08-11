import type { ActionDefinition } from "@w6w/types";
import { GetResponseClient } from "../lib/client.ts";

/**
 * `POST /tags` — create a tag.
 *
 * Answers **201** with the new tag, unlike Create Contact's queued 202 — tags
 * are created synchronously and the `tagId` is usable immediately.
 *
 * GetResponse constrains tag names to letters, digits, underscores and hyphens;
 * a space or punctuation is a validation error rather than being normalised.
 *
 * Not idempotent: creating a tag whose name already exists is rejected, not
 * ignored, so a workflow that may re-run should List Tags first.
 */
interface Input {
  name: string;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag. Returns the new tag id immediately.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { pattern: "^[A-Za-z0-9_-]+$" },
      hint: "Letters, digits, underscores and hyphens only — GetResponse rejects spaces and " +
        "punctuation rather than normalising them.",
    },
  ],
  output: [{ key: "tagId", type: "string", label: "The created tag's id" }],

  execute(input, ctx) {
    return new GetResponseClient(ctx).request("/tags", {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default tagCreate;
