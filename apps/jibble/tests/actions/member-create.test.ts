import { assert, assertEquals, assertRejects } from "@std/assert";
import memberCreate from "../../actions/member-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-create: POSTs to /v1/People with the vendor's odd IPersonSetting field", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1" } }]);
  await memberCreate.execute({
    fullName: "John Doe",
    email: "j@example.com",
    sendInviteEmail: true,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/People");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.fullName, "John Doe");
  assertEquals(body["IPersonSetting/SendInviteEmail"], true);
});

Deno.test("member-create: defaults sendInviteEmail to false rather than omitting it", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1" } }]);
  await memberCreate.execute({ fullName: "Jane Doe" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body["IPersonSetting/SendInviteEmail"], false);
  assert(!("email" in body) || body.email === undefined);
});

Deno.test("member-create: requires fullName", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(memberCreate.execute({ fullName: "" }, ctx)),
    Error,
    "fullName",
  );
});
