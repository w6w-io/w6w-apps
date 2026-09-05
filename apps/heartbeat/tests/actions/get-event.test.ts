import { assertEquals } from "@std/assert";
import getEvent from "../../actions/get-event.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-event: GET /events/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1", name: "Onboarding" } }]);
  const out = await getEvent.execute({ eventID: "e1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v0/events/e1");
  assertEquals(out.name, "Onboarding");
});
