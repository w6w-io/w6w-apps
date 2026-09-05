import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/records-search.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

Deno.test("records-search: GETs /k/v1/records.json with query and fields", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { records: [{ $id: { value: "1" } }], totalCount: null } }],
    conn,
  );
  const out = await action.execute(
    { appId: "1", query: "$id > 0", fields: ["$id"] },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("app"), "1");
  assertEquals(url.searchParams.get("query"), "$id > 0");
  assertEquals(url.searchParams.get("fields[0]"), "$id");
  assertEquals(out.records, [{ $id: { value: "1" } }]);
});

Deno.test("records-search: omits totalCount unless explicitly requested", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { records: [], totalCount: null } }], conn);
  await action.execute({ appId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("totalCount"), false);
});

Deno.test("records-search: sets totalCount=true when requested", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { records: [], totalCount: "5" } }], conn);
  await action.execute({ appId: "1", totalCount: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("totalCount"), "true");
});

Deno.test("records-search: rejects a non-array `fields` before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute({ appId: "1", fields: '"not-an-array"' }, ctx),
    Error,
  );
  assert(err.message.includes("fields"), err.message);
  assertEquals(calls.length, 0);
});
