import type { ActionDefinition } from "@w6w/types";
import { boolStr, compact, encodeId, TapfiliateClient } from "../lib/client.ts";
import { conversionIdParam, metaDataParam } from "../lib/params.ts";

/** `PATCH /conversions/{conversion_id}/{?recalculate_commissions}` */
interface Input {
  conversionId: number;
  amount?: number;
  externalId?: string;
  metaData?: unknown;
  recalculateCommissions?: boolean;
}

const conversionUpdate: ActionDefinition<Input> = {
  key: "conversion-update",
  type: "perform",
  resource: "conversion",
  title: "Update Conversion",
  description: "Update a conversion's amount, external id, or meta data.",
  idempotent: true,
  params: [
    conversionIdParam,
    { key: "amount", label: "New amount", type: "number" },
    { key: "externalId", label: "External id", type: "string" },
    metaDataParam,
    {
      key: "recalculateCommissions",
      label: "Recalculate commissions",
      type: "boolean",
      default: false,
      hint: "Also recalculate the conversion's commissions when the amount changes.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Conversion id" },
    { key: "amount", type: "number", label: "Amount, updated" },
    { key: "commissions", type: "array", label: "Commissions, possibly recalculated" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(`/conversions/${encodeId(input.conversionId)}/`, {
      method: "PATCH",
      query: compact({ recalculate_commissions: boolStr(input.recalculateCommissions) }),
      body: compact({
        amount: input.amount,
        external_id: input.externalId,
        meta_data: input.metaData,
      }),
    });
  },
};

export default conversionUpdate;
