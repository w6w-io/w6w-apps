import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/verify-check.ts";

Deno.test("verify-check: GETs /verify/{id} with the token as a query param", async () => {
  const body = { id: "4e213b01155d1e35a9d9571v00162985", status: "verified" };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await action.execute!(
    { verifyId: "4e213b01155d1e35a9d9571v00162985", token: "123456" },
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/verify/4e213b01155d1e35a9d9571v00162985");
  assertEquals(queryOf(calls[0].url), { token: "123456" });
  assertEquals(result, body);
});

Deno.test("verify-check: idempotent is explicitly false — a token can only be checked once", () => {
  assertEquals(action.idempotent, false);
});
