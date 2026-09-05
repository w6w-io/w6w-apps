import type { ActionDefinition } from "@w6w/types";
import { RespondioClient } from "../lib/client.ts";

/** `GET /space/custom_field/{id}` — `SpaceClient.getCustomField` in the official SDK. */
interface Input {
  id: number;
}

const spaceCustomFieldGet: ActionDefinition<Input> = {
  key: "space-custom-field-get",
  type: "read",
  resource: "space",
  title: "Get Custom Field",
  description: "Look up one workspace custom field by id.",
  params: [
    { key: "id", label: "Custom field ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Custom field ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "dataType", type: "string", label: "Data type" },
    { key: "allowedValues", type: "array", label: "Allowed values" },
  ],

  execute(input, ctx) {
    if (!Number.isFinite(input.id)) throw new Error("Custom field ID is required");
    return new RespondioClient(ctx).get(`/space/custom_field/${input.id}`);
  },
};

export default spaceCustomFieldGet;
