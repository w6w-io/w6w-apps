import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-update.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

Deno.test("record-update: PUTs by recordId", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { revision: "2" } }], conn);
  const out = await action.execute(
    { appId: "1", recordId: "1", record: { Text: { value: "ABC" } } },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    app: "1",
    id: "1",
    record: { Text: { value: "ABC" } },
  });
  assertEquals(out, { revision: "2" });
});

Deno.test("record-update: PUTs by updateKey when recordId is omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { revision: "1" } }], conn);
  await action.execute(
    { appId: "1", updateKeyField: "Code", updateKeyValue: "X1", record: { Text: { value: "y" } } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    app: "1",
    updateKey: { field: "Code", value: "X1" },
    record: { Text: { value: "y" } },
  });
});

Deno.test("record-update: rejects both recordId and updateKeyField together, before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () =>
      await action.execute(
        { appId: "1", recordId: "1", updateKeyField: "Code", updateKeyValue: "X1" },
        ctx,
      ),
    Error,
  );
  assert(err.message.includes("not both"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("record-update: rejects neither recordId nor updateKeyField, before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute({ appId: "1" }, ctx), Error);
  assertEquals(calls.length, 0);
});

Deno.test("record-update: includes revision when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { revision: "3" } }], conn);
  await action.execute({ appId: "1", recordId: "1", revision: "2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).revision, "2");
});
