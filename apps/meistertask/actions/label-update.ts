import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";
import { labelColorOptions } from "../lib/params.ts";

/** `PUT /labels/:id` — rename a label or change its color. */
interface Input {
  id: number;
  name?: string;
  color?: string;
}

const labelUpdate: ActionDefinition<Input> = {
  key: "label-update",
  type: "perform",
  resource: "label",
  title: "Update Label",
  description: "Rename a label or change its color.",
  idempotent: true,
  params: [
    { key: "id", label: "Label ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "color", label: "Color", type: "select", options: labelColorOptions },
  ],
  output: [
    { key: "id", type: "number", label: "Label ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Color" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/labels/${input.id}`, {
      method: "PUT",
      body: { name: input.name, color: input.color },
    });
  },
};

export default labelUpdate;
