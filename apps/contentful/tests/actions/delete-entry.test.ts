import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-entry.ts";

Deno.test("delete-entry: DELETEs on Management API and returns ok on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!(
    { entryId: "e-1", spaceId: "sp", environmentId: "master" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.contentful.com");
  assertEquals(url.pathname, "/spaces/sp/environments/master/entries/e-1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { ok: true });
});

Deno.test("delete-entry: is marked idempotent", () => {
  assertEquals(action.idempotent, true);
});
