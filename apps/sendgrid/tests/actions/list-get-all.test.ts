import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-get-all.ts";

Deno.test("list-get-all: GET /marketing/lists, respects limit", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { result: [{ id: "1" }, { id: "2" }, { id: "3" }], _metadata: {} },
    },
  ]);
  const result = await action.execute!({ limit: 2 }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.sendgrid.com/v3/marketing/lists");
  assertEquals(result, [{ id: "1" }, { id: "2" }]);
});

Deno.test("list-get-all: follows _metadata.next pagination when returnAll", async () => {
  const nextUrl = "https://api.sendgrid.com/v3/marketing/lists?page_token=xyz";
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: [{ id: "1" }], _metadata: { next: nextUrl } } },
    { status: 200, body: { result: [{ id: "2" }], _metadata: {} } },
  ]);
  const result = await action.execute!({ returnAll: true }, ctx);

  assertEquals(calls.length, 2);
  assertEquals(calls[1].url, nextUrl);
  assertEquals(result, [{ id: "1" }, { id: "2" }]);
});
