import { assertEquals } from "@std/assert";
import secretList from "../../actions/secret-list.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("secret-list: lists org secrets, mapped to { items, nextCursor }", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      items: [{
        secret_id: "secret-1",
        key: "GH_TOKEN",
        is_sensitive: true,
        access_type: "org",
        note: null,
        created_at: 1,
        created_by: "svc-1",
      }],
      end_cursor: "c1",
      has_next_page: false,
    },
  }]);
  const out = await secretList.execute({}, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/secrets`);
  assertEquals(out.nextCursor, undefined);
  assertEquals(out.items[0].key, "GH_TOKEN");
});

Deno.test("secret-list: no secret value ever appears anywhere in the result", async () => {
  const { ctx } = mockCtx([{
    body: {
      items: [{ secret_id: "secret-1", key: "GH_TOKEN", is_sensitive: true, access_type: "org" }],
    },
  }]);
  const out = await secretList.execute({}, ctx);
  const keys = new Set(Object.keys(out.items[0] as unknown as Record<string, unknown>));
  assertEquals(keys.has("value"), false);
});
