import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/list-event-actions.ts";

Deno.test("list-event-actions: GETs /event_actions with pagination params", async () => {
  const { ctx, calls } = mockDripCtx([{
    body: { event_actions: ["Ate a sandwich", "Started a trial"] },
  }]);
  const out = await action.execute({ page: 2, perPage: 200 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/1234567/event_actions");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "200");
  assertEquals(out, { eventActions: ["Ate a sandwich", "Started a trial"] });
});

Deno.test("list-event-actions: defaults to an empty array", async () => {
  const { ctx } = mockDripCtx([{ body: {} }]);
  assertEquals(await action.execute({}, ctx), { eventActions: [] });
});
