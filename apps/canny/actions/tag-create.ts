import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { tagOutput } from "../lib/output.ts";
import { boardIdParam } from "../lib/params.ts";

/**
 * `POST /v1/tags/create` — create a tag on a board, or fetch the existing one
 * with that name.
 *
 * Idempotent: Canny's own "Returns" text says the tag object comes back "if
 * it was successfully created or already exists" — get-or-create by name.
 */
interface Input {
  boardID: string;
  name: string;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag on a board. Calling it again with the same name returns the same tag.",
  idempotent: true,
  params: [
    boardIdParam(true),
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 30 },
      hint: "Must be between 1 and 30 characters long.",
    },
  ],
  output: tagOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/tags/create", {
      boardID: input.boardID,
      name: input.name,
    });
  },
};

export default tagCreate;
