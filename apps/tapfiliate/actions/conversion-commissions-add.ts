import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TapfiliateClient } from "../lib/client.ts";
import { conversionIdParam } from "../lib/params.ts";

/** `POST /conversions/{conversion_id}/commissions/` — add an extra commission to an existing conversion. */
interface Input {
  conversionId: number;
  conversionSubAmount: number;
  commissionType?: string;
  comment?: string;
}

const conversionCommissionsAdd: ActionDefinition<Input> = {
  key: "conversion-commissions-add",
  type: "perform",
  resource: "conversion",
  title: "Add Commissions to Conversion",
  description:
    "Add one or more commissions (per the program's commission structure) to an existing conversion.",
  idempotent: false,
  params: [
    conversionIdParam,
    {
      key: "conversionSubAmount",
      label: "Sub-amount",
      type: "number",
      required: true,
      hint:
        "The amount the commission is calculated on, using the supplied (or the program's default) commission type.",
    },
    {
      key: "commissionType",
      label: "Commission type",
      type: "string",
      hint: "Defaults to the program's default commission type.",
    },
    { key: "comment", label: "Comment", type: "text", hint: "Visible to the affiliate." },
  ],
  output: [{ key: "items", type: "array", label: "Commissions created by this call" }],

  async execute(input, ctx) {
    const items = await new TapfiliateClient(ctx).json(
      `/conversions/${encodeId(input.conversionId)}/commissions/`,
      {
        method: "POST",
        body: compact({
          conversion_sub_amount: input.conversionSubAmount,
          commission_type: input.commissionType,
          comment: input.comment,
        }),
      },
    );
    return { items };
  },
};

export default conversionCommissionsAdd;
