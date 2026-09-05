import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/candidate-activity-list.ts";

Deno.test("candidate-activity-list: GETs /candidates/:id/activities", async () => {
  const { ctx, calls } = mockWorkableCtx([{
    body: { activities: [{ action: "applied" }] },
  }]);
  const out = await action.execute({ id: "c1", limit: 10 }, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/candidates/c1/activities?limit=10");
  assertEquals(out, { activities: [{ action: "applied" }], nextUrl: undefined });
});

Deno.test("candidate-activity-list: pageUrl bypasses every other filter", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { activities: [] } }]);
  const nextUrl = "https://acme.workable.com/spi/v3/candidates/c1/activities?since_id=x";
  await action.execute({ id: "c1", pageUrl: nextUrl, actions: "comment" }, ctx);
  assertEquals(calls[0].url, nextUrl);
});
