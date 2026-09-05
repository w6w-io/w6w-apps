import { assertEquals } from "@std/assert";
import programCommissionTypesList from "../../actions/program-commission-types-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("program-commission-types-list: lists commission types for a program", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ title: "standard", identifier: "standard", commission_value: 10 }],
  }]);
  const out = await programCommissionTypesList.execute(
    { programId: "johns-affiliate-program" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/programs/johns-affiliate-program/commission-types/");
  assertEquals(out.items, [{ title: "standard", identifier: "standard", commission_value: 10 }]);
});
