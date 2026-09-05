import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/candidate-get.ts";

Deno.test("candidate-get: GETs /candidates/:id", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { candidate: { id: "c1" } } }]);
  const out = await action.execute({ id: "c1" }, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/candidates/c1");
  assertEquals(out, { candidate: { id: "c1" } });
});
