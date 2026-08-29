import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/conversation-list.ts";

Deno.test("conversation-list: GETs /conversations with pagination", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: [], meta: { page: 1 } } }]);
  const out = await action.execute({ page: 1, pageSize: 25 }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.api.kustomerapp.com/v1/conversations?page=1&pageSize=25",
  );
  assertEquals(out, { data: [], meta: { page: 1 } });
});
