import type { ActionDefinition } from "@w6w/types";
import { LawmaticsClient, type LawmaticsItemEnvelope } from "../lib/client.ts";

interface Input {
  matterId: string;
  fields?: string;
}

/** `GET /v1/prospects/:prospect_id` — a single Matter by id. */
const getMatter: ActionDefinition<Input> = {
  key: "get-matter",
  type: "read",
  resource: "matter",
  title: "Get Matter",
  description: 'Fetch a single Matter (Lawmatics\' "Prospect") by id.',
  params: [
    { key: "matterId", label: "Matter ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint:
        'Comma-separated attribute/relationship names, or "all". Leave blank for the default set.',
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Matter ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Matter attributes" },
    { key: "relationships", type: "object", label: "Related records" },
  ],

  async execute(input, ctx) {
    const res = await new LawmaticsClient(ctx).request<LawmaticsItemEnvelope>(
      `/prospects/${encodeURIComponent(input.matterId)}`,
      { query: { fields: input.fields } },
    );
    return res.data;
  },
};

export default getMatter;
