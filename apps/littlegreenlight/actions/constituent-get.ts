import type { ActionDefinition } from "@w6w/types";
import { LglClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/** `GET /api/v1/constituents/{id}.json`. */
const constituentGet: ActionDefinition<Input> = {
  key: "constituent-get",
  type: "read",
  resource: "constituent",
  title: "Get Constituent",
  description: "Show a single constituent's full record by its LGL id.",
  params: [
    {
      key: "id",
      label: "Constituent ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Constituent ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "org_name", type: "string", label: "Organization name" },
    { key: "email_addresses", type: "array", label: "Email addresses" },
  ],

  async execute(input, ctx) {
    return await new LglClient(ctx).get(`/constituents/${input.id}`);
  },
};

export default constituentGet;
