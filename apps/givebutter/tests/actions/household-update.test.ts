import { assertEquals } from "@std/assert";
import householdUpdate from "../../actions/household-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("household-update: PUTs to /households/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1 }) }]);
  await householdUpdate.execute({ id: "1", note: "updated" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/households/1");
  assertEquals(JSON.parse(calls[0].body!), { note: "updated" });
});
