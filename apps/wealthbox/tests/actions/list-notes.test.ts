import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-notes.ts";

Deno.test("list-notes: is a search action", () => {
  assertEquals(action.type, "search");
});

Deno.test("list-notes: GETs /notes with mapped filters and returns the status_updates envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status_updates: [{ id: 1 }] } }]);
  const result = await action.execute({ resourceId: 1, resourceType: "Contact" }, ctx) as {
    status_updates: unknown[];
  };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/notes");
  assertEquals(url.searchParams.get("resource_id"), "1");
  assertEquals(url.searchParams.get("resource_type"), "Contact");
  assertEquals(result.status_updates.length, 1);
});
