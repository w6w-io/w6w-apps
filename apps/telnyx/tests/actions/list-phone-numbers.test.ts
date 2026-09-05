import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-phone-numbers.ts";

Deno.test("list-phone-numbers: GETs /phone_numbers and returns the full data+meta envelope", async () => {
  const body = { data: [{ id: "n1", phone_number: "+1" }], meta: { total_results: 1 } };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await action.execute!({}, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/phone_numbers");
  assertEquals(result, body);
});

Deno.test("list-phone-numbers: encodes pagination and filters using deepObject bracket keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: {} } }]);
  await action.execute!(
    { pageSize: 50, pageNumber: 2, status: "active", phoneNumber: "415" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page[size]"), "50");
  assertEquals(url.searchParams.get("page[number]"), "2");
  assertEquals(url.searchParams.get("filter[status]"), "active");
  assertEquals(url.searchParams.get("filter[phone_number]"), "415");
});

Deno.test("list-phone-numbers: omits unset filters rather than sending empty params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("filter[status]"), false);
  assertEquals(url.searchParams.has("filter[phone_number]"), false);
  assertEquals(url.searchParams.has("page[size]"), false);
});
