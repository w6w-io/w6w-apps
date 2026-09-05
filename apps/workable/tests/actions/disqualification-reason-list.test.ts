import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/disqualification-reason-list.ts";

Deno.test("disqualification-reason-list: GETs /disqualification_reasons and forwards the body as-is", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { anything: "the vendor sends" } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/disqualification_reasons");
  assertEquals(out, { anything: "the vendor sends" });
});
