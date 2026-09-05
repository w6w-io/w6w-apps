import { assertEquals } from "@std/assert";
import householdGet from "../../actions/household-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("household-get: fetches /households/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1, name: "The Smiths" }) }]);
  const out = await householdGet.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/households/1");
  assertEquals(out, { id: 1, name: "The Smiths" });
});
