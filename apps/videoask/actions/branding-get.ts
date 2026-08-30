import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/** `GET /brandings/{branding_id}` — one brand's full definition. */
interface Input {
  brandingId: string;
  organizationId?: string;
}

const brandingGet: ActionDefinition<Input> = {
  key: "branding-get",
  type: "read",
  resource: "branding",
  title: "Get Brand",
  description: "Fetch one brand's full definition.",
  params: [
    { key: "brandingId", label: "Branding ID", type: "string", required: true },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The brand" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(
      `/brandings/${encodeId(input.brandingId)}`,
      { organizationId: input.organizationId },
    );
    return { result };
  },
};

export default brandingGet;
