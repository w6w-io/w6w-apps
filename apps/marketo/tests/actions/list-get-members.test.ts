import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-get-members.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("list-get-members: GETs one page by default", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, result: [{ id: 1 }, { id: 2 }], nextPageToken: "TOKEN1" } },
  ], conn);
  const out = await action.execute!({ listId: 100 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/lists/100/leads.json");
  assertEquals(out, [{ id: 1 }, { id: 2 }]);
});

Deno.test("list-get-members: returnAll pages until nextPageToken is absent", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, result: [{ id: 1 }], nextPageToken: "TOKEN1" } },
    { body: { success: true, result: [{ id: 2 }], nextPageToken: "TOKEN2" } },
    { body: { success: true, result: [{ id: 3 }] } },
  ], conn);
  const out = await action.execute!({ listId: 100, returnAll: true }, ctx);
  assertEquals(calls.length, 3);
  assertEquals(new URL(calls[1].url).searchParams.get("nextPageToken"), "TOKEN1");
  assertEquals(new URL(calls[2].url).searchParams.get("nextPageToken"), "TOKEN2");
  assertEquals(out, [{ id: 1 }, { id: 2 }, { id: 3 }]);
});

Deno.test("list-get-members: returnAll stops on an empty page even if a token is still present", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, result: [], nextPageToken: "TOKEN1" } },
  ], conn);
  const out = await action.execute!({ listId: 100, returnAll: true }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(out, []);
});
