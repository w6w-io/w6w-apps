import type { ActionDefinition } from "@w6w/types";
import { BubbleClient, formatTypeName, parseJson } from "../lib/client.ts";
import { TYPE_PARAM } from "../lib/params.ts";

interface Input {
  type: string;
  fields: string | Record<string, unknown>;
}

interface CreateResponse {
  status: string;
  id: string;
}

/**
 * `POST /obj/{type}` — verified against
 * `core-resources/api/the-bubble-api/the-data-api/data-api-requests`.
 *
 * Create one thing of a Data Type. Field keys and value types must match the
 * Data Type's own field names (returned by `data-get`); any field left out
 * gets its own default value if it has one. Creating a User accepts the two
 * built-in `Email` (required) and `Password` (optional) fields — this does
 * not sign that User in or return a token.
 *
 * The Data Type's Privacy Rule must have `Create via API` enabled, or Bubble
 * answers 401 even with a valid admin token.
 */
const action: ActionDefinition<Input, CreateResponse> = {
  key: "data-create",
  type: "perform",
  resource: "data",
  title: "Create Thing",
  description: "Create one record of a Data Type.",
  idempotent: false,
  params: [
    TYPE_PARAM,
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Object of field name → value, e.g. `{"Unit name": "Unit A", "Unit number": 3}`.',
    },
  ],
  output: [
    { key: "status", label: "Status", type: "string" },
    { key: "id", label: "Unique ID", type: "string" },
  ],

  async execute(input, ctx) {
    const type = formatTypeName(input.type);
    const fields = parseJson(input.fields, "fields");
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw new Error("`fields` must be a JSON object");
    }
    const client = new BubbleClient(ctx);
    ctx.log("info", "creating Bubble thing", {
      type,
      invocationId: ctx.invocation?.invocationId,
    });
    return await client.request<CreateResponse>(`/obj/${type}`, { method: "POST", json: fields });
  },
};

export default action;
