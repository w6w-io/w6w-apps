import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-base-schema.ts";

Deno.test("get-base-schema: GETs /meta/bases/{baseId}/tables", async () => {
  const body = { tables: [{ id: "tbl1", name: "Users", fields: [] }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ baseId: "appABC" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v0/meta/bases/appABC/tables");
  assertEquals(result, body);
});

Deno.test("get-base-schema: forwards include[] as bracketed repeats", async () => {
  const { ctx, calls } = mockCtx([{ body: { tables: [] } }]);
  await action.execute!({ baseId: "appABC", include: ["visibleFieldIds"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("include[]"), ["visibleFieldIds"]);
});
