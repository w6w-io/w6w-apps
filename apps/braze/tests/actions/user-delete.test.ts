import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-delete.ts";

const display = { display: { instance: "iad-01" } };

Deno.test("user-delete: sends only non-empty identifier arrays", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], display);
  await action.execute!({ externalIds: ["e1", "e2"] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.external_ids, ["e1", "e2"]);
  assertEquals(body.braze_ids, undefined);
  assertEquals(body.user_aliases, undefined);
});

Deno.test("user-delete: empty arrays are omitted rather than sent as []", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], display);
  await action.execute!({ externalIds: [], brazeIds: ["b1"] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.external_ids, undefined);
  assertEquals(body.braze_ids, ["b1"]);
});
