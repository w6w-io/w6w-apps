import { assertEquals } from "@std/assert";
import matterCreate from "../../actions/matter-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("matter-create: POSTs /matters.json with client/description wrapped correctly", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: envelope({ id: 9, description: "New matter" }),
  }]);
  await matterCreate.execute({ clientId: 42, description: "New matter" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v4/matters.json");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { client: { id: 42 }, description: "New matter" },
  });
});

Deno.test("matter-create: optional nested refs are only sent when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 9 }) }]);
  await matterCreate.execute(
    { clientId: 1, description: "d", practiceAreaId: 3, billable: false },
    ctx,
  );
  const body = JSON.parse(calls[0].body!).data;
  assertEquals(body.practice_area, { id: 3 });
  assertEquals(body.billable, false);
  assertEquals("responsible_attorney" in body, false);
});

Deno.test("matter-create: is declared non-idempotent (a retry starts a second matter)", () => {
  assertEquals(matterCreate.idempotent, false);
});
