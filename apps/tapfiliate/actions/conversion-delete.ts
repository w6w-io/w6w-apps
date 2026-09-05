import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { conversionIdParam } from "../lib/params.ts";

/** `DELETE /conversions/{conversion_id}/` */
interface Input {
  conversionId: number;
}

const conversionDelete: ActionDefinition<Input> = {
  key: "conversion-delete",
  type: "perform",
  resource: "conversion",
  title: "Delete Conversion",
  description: "Permanently delete a conversion and its commissions.",
  idempotent: true,
  params: [conversionIdParam],
  output: [{
    key: "result",
    type: "object",
    label: "Deleted conversion, if the vendor returns a body",
  }],

  async execute(input, ctx) {
    const result = await new TapfiliateClient(ctx).json(
      `/conversions/${encodeId(input.conversionId)}/`,
      {
        method: "DELETE",
      },
    );
    return { result: result ?? null };
  },
};

export default conversionDelete;
