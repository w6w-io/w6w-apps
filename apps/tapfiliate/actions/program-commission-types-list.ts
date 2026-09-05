import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { programIdParam } from "../lib/params.ts";

/**
 * `GET /programs/{program_id}/commission-types/`
 *
 * Useful ahead of `conversion-create`/`conversion-commissions-add`: their
 * `commissionType` param takes one of the `identifier` values this endpoint
 * lists.
 */
interface Input {
  programId: string;
}

const programCommissionTypesList: ActionDefinition<Input> = {
  key: "program-commission-types-list",
  type: "read",
  resource: "program",
  title: "List Program Commission Types",
  description: "List a program's commission types (and any per-affiliate-group overrides).",
  params: [programIdParam],
  output: [{ key: "items", type: "array", label: "Commission types" }],

  async execute(input, ctx) {
    const items = await new TapfiliateClient(ctx).json(
      `/programs/${encodeId(input.programId)}/commission-types/`,
    );
    return { items };
  },
};

export default programCommissionTypesList;
