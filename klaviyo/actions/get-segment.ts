import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  segmentId: string;
  additionalFields?: string;
  include?: string;
}

const getSegment: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "get-segment",
  type: "read",
  resource: "segment",
  title: "Get Segment",
  description: "Retrieve a single Klaviyo segment by ID.",
  params: [
    { key: "segmentId", label: "Segment ID", type: "string", required: true },
    { key: "additionalFields", label: "Additional fields", type: "string" },
    { key: "include", label: "Include", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope>(`/segments/${input.segmentId}/`, {
      query: {
        "additional-fields[segment]": input.additionalFields,
        include: input.include,
      },
    });
  },
};

export default getSegment;
