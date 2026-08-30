import type { ActionDefinition } from "@w6w/types";
import { ESTIMATE_FIELDS, unwrapBusiness, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  estimateId: string;
}

const QUERY = `
  query GetEstimate($businessId: ID!, $estimateId: ID!) {
    business(id: $businessId) {
      id
      estimate(id: $estimateId) {
        ${ESTIMATE_FIELDS}
      }
    }
  }
`;

const estimateGet: ActionDefinition<Input> = {
  key: "estimate-get",
  type: "read",
  resource: "estimate",
  title: "Get Estimate",
  description: "Retrieve a single estimate by id.",
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    { key: "estimateId", label: "Estimate ID", type: "string", required: true },
  ],
  output: [{ key: "estimate", type: "object", label: "The estimate" }],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(QUERY, {
      businessId: input.businessId,
      estimateId: input.estimateId,
    });
    return unwrapBusiness(data, "estimate");
  },
};

export default estimateGet;
