import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/records-add.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

Deno.test("records-add: POSTs /k/v1/records.json with the records array", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { ids: ["1", "2"], revisions: ["1", "1"] } }],
    conn,
  );
  const out = await action.execute(
    { appId: "1", records: [{ Text: { value: "a" } }, { Text: { value: "b" } }] },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/v1/records.json");
  assertEquals(out, { ids: ["1", "2"], revisions: ["1", "1"] });
});

Deno.test("records-add: rejects a non-array `records`", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute({ appId: "1", records: "nope" }, ctx),
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("records-add: rejects more than 100 records before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const records = Array.from({ length: 101 }, () => ({ Text: { value: "x" } }));
  const err = await assertRejects(
    async () => await action.execute({ appId: "1", records }, ctx),
    Error,
  );
  assert(err.message.includes("100"), err.message);
  assertEquals(calls.length, 0);
});
