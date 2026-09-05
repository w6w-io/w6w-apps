import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/records-delete.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

Deno.test("records-delete: DELETEs /k/v1/records.json with the ids array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute({ appId: "1", recordIds: ["1", "2"] }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), { app: "1", ids: ["1", "2"] });
});

Deno.test("records-delete: includes revisions when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute({ appId: "1", recordIds: ["1"], revisions: ["3"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { app: "1", ids: ["1"], revisions: ["3"] });
});

Deno.test("records-delete: rejects an empty recordIds array before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute({ appId: "1", recordIds: [] }, ctx), Error);
  assertEquals(calls.length, 0);
});

Deno.test("records-delete: rejects more than 100 ids before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const recordIds = Array.from({ length: 101 }, (_, i) => String(i + 1));
  const err = await assertRejects(
    async () => await action.execute({ appId: "1", recordIds }, ctx),
    Error,
  );
  assert(err.message.includes("100"), err.message);
  assertEquals(calls.length, 0);
});
