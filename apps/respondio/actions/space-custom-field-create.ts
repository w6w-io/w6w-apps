import type { ActionDefinition } from "@w6w/types";
import { compact, RespondioClient } from "../lib/client.ts";
import { customFieldDataTypeOptions } from "../lib/params.ts";

/**
 * `POST /space/custom_field` — `SpaceClient.createCustomField` in the
 * official SDK. `allowedValues` only applies to `dataType: "list"`.
 * Not idempotent: the vendor's behaviour on a duplicate name is undocumented
 * (create-vs-conflict), so this app does not claim a retry is safe.
 */
interface Input {
  name: string;
  slug?: string;
  description?: string;
  dataType: "text" | "list" | "checkbox" | "email" | "number" | "url" | "date" | "time";
  allowedValues?: string[] | string;
}

/** `FIELD_LIMITS` in the official `respond-io/mcp-server`. */
const NAME_MAX_LENGTH = 50;
const SLUG_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 255;

const spaceCustomFieldCreate: ActionDefinition<Input> = {
  key: "space-custom-field-create",
  type: "perform",
  resource: "space",
  title: "Create Custom Field",
  description: "Create a workspace-level custom field for contacts.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { maxLength: NAME_MAX_LENGTH },
    },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      validation: { maxLength: SLUG_MAX_LENGTH },
      advanced: true,
      hint: "Machine name used by the API. Defaults to a slug of Name when omitted.",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      validation: { maxLength: DESCRIPTION_MAX_LENGTH },
    },
    {
      key: "dataType",
      label: "Data type",
      type: "select",
      required: true,
      options: customFieldDataTypeOptions,
    },
    {
      key: "allowedValues",
      label: "Allowed values",
      type: "array",
      item: { type: "string" },
      showIf: { "==": [{ var: "dataType" }, "list"] },
      hint: 'Required when Data type is "List".',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Custom field ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "dataType", type: "string", label: "Data type" },
    { key: "allowedValues", type: "array", label: "Allowed values" },
  ],

  execute(input, ctx) {
    if (!input.name) throw new Error("Name is required");
    if (!input.dataType) throw new Error("Data type is required");
    const allowedValues = Array.isArray(input.allowedValues)
      ? input.allowedValues
      : input.allowedValues
      ? [input.allowedValues]
      : undefined;
    if (input.dataType === "list" && !allowedValues?.length) {
      throw new Error('Allowed values are required when Data type is "List"');
    }
    return new RespondioClient(ctx).post(
      "/space/custom_field",
      compact({
        name: input.name,
        slug: input.slug,
        description: input.description,
        dataType: input.dataType,
        allowedValues,
      }),
    );
  },
};

export default spaceCustomFieldCreate;
