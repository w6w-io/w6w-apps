import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recipient-find.ts";

Deno.test("recipient-find: looks up by phone by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "rcp_1" } }]);
  await action.execute!({ by: "phone", value: "+16505551133" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/recipients/phone/%2B16505551133");
});

Deno.test("recipient-find: looks up by name, URL-encoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "rcp_1" } }]);
  await action.execute!({ by: "name", value: "neiman runtilly" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/recipients/name/neiman%20runtilly");
});

Deno.test("recipient-find: value is required and `by` is validated", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ by: "phone" }, ctx), Error, "value");
  await assertRejects(
    async () => await action.execute!({ by: "email", value: "x" }, ctx),
    Error,
    "`by`",
  );
  assertEquals(calls.length, 0);
});
