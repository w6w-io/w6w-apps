import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deals-info.ts";

Deno.test("deals-info: POSTs deals.info with {id} and returns the deal", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { id: "d1", title: "Big deal" } },
  }]);
  const out = await action.execute({ id: "d1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/deals.info");
  assertEquals(JSON.parse(calls[0].body!), { id: "d1" });
  assertEquals(out, { deal: { id: "d1", title: "Big deal" } });
});
