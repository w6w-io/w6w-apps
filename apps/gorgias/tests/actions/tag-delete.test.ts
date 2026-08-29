import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/tag-delete.ts";

Deno.test("tag-delete: DELETEs /tags/{id}", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ status: 204 }]);
  const out = await action.execute({ tagId: 5 }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/tags/5");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
