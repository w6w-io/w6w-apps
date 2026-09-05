import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";
import { fieldTypeOptions } from "../lib/params.ts";

/** `POST /v2/fields` — creates a new custom subscriber field. */
interface Input {
  title: string;
  type: string;
}

const fieldCreate: ActionDefinition<Input> = {
  key: "field-create",
  type: "perform",
  resource: "field",
  title: "Create Field",
  description: "Create a new custom subscriber field.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "type", label: "Type", type: "select", required: true, options: fieldTypeOptions },
  ],
  output: [
    { key: "id", type: "string", label: "Field ID" },
    { key: "field_name", type: "string", label: "Placeholder name" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data("/fields", {
      method: "POST",
      body: { title: input.title, type: input.type },
    });
  },
};

export default fieldCreate;
