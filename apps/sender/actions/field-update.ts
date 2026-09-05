import type { ActionDefinition } from "@w6w/types";
import { compact, SenderClient } from "../lib/client.ts";

/**
 * `PATCH /v2/fields/{id}` — renames a field and/or toggles its visibility.
 * Changing a field's type is not supported by the API.
 */
interface Input {
  id: string;
  title?: string;
  show?: boolean;
}

const fieldUpdate: ActionDefinition<Input> = {
  key: "field-update",
  type: "perform",
  resource: "field",
  title: "Rename Field",
  description:
    "Rename a field and/or show or hide it in the subscribers dashboard. Field type cannot be changed.",
  idempotent: true,
  params: [
    { key: "id", label: "Field ID", type: "string", required: true },
    { key: "title", label: "New title", type: "string" },
    {
      key: "show",
      label: "Show in subscribers dashboard",
      type: "boolean",
      hint: "Displays this field as an active filter field in the subscribers dashboard.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/fields/${encodeURIComponent(input.id)}`, {
      method: "PATCH",
      body: compact({ title: input.title, show: input.show }),
    });
  },
};

export default fieldUpdate;
