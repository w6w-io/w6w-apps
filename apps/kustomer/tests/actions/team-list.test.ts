import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/team-list.ts";

Deno.test("team-list: GETs /teams with pagination", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: [], meta: { page: 1 } } }]);
  const out = await action.execute({ page: 1 }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/teams?page=1");
  assertEquals(out, { data: [], meta: { page: 1 } });
});

Deno.test("team-list: passes deleted=true through", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: [] } }]);
  await action.execute({ deleted: true }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/teams?deleted=true");
});
