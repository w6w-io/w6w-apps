import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/data-update.ts";

const display = { baseUrl: "https://myapp.bubbleapps.io" };

Deno.test("data-update: PATCHes only the given fields and treats 204 as success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display });

  const out = await action.execute({
    type: "Rental Unit",
    uniqueId: "1x1",
    fields: { "Unit name": "New name" },
  }, ctx);

  assertEquals(calls[0].url, "https://myapp.bubbleapps.io/api/1.1/obj/rentalunit/1x1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { "Unit name": "New name" });
  assertEquals(out, { ok: true });
});

Deno.test("data-update: is declared idempotent — the same fields land in the same state", () => {
  assertEquals(action.idempotent, true);
});
