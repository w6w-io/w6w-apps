import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/client-get.ts";

Deno.test("client-get: GETs /admin/clients/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 12, name: "Jane" } }], { display: TEST_DISPLAY });
  const result = await action.execute({ id: "12" }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/clients/12");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: 12, name: "Jane" });
});
