import type { ActionDefinition } from "@w6w/types";
import { deskGet, type DeskGetInput } from "../lib/desk.ts";
import { orgId, recordId } from "../lib/params.ts";

interface Input extends DeskGetInput {
  include?: string;
}

const contactGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Get a single contact by id.",
  params: [
    recordId,
    orgId,
    { key: "include", label: "Include", type: "string", hint: "Supported value: owner." },
  ],
  output: [{ key: "id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    return deskGet(ctx, "/contacts", input, { include: input.include });
  },
};

export default contactGet;
