import { assertEquals } from "@std/assert";
import discountCreate from "../../actions/discount-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("discount-create: sends ticket_types/products as repeated array fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "di_1" } }]);
  await discountCreate.execute(
    {
      name: "Early bird",
      code: "EARLYBIRD",
      type: "fixed_amount",
      price: 500,
      ticketTypes: "tt_1,tt_2",
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/discounts");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("type"), "fixed_amount");
  assertEquals(body.getAll("ticket_types[]"), ["tt_1", "tt_2"]);
});
