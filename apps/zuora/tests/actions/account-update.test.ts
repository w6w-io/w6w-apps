import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/account-update.ts";

Deno.test("account-update: PUTs only the fields provided", async () => {
  const { ctx, calls } = mockCtx([one({ id: "acc1", notes: "hi" })], { display });
  await action.execute!({ accountKey: "A00000001", notes: "hi" }, ctx);
  assertEquals(calls[0].url, "https://rest.zuora.com/v1/accounts/A00000001");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { notes: "hi" });
});

Deno.test("account-update: does not send billToContact unless at least one bill-to field is set", async () => {
  const { ctx, calls } = mockCtx([one({ id: "acc1" })], { display });
  await action.execute!({ accountKey: "A1", name: "New Name" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(!("billToContact" in body));
});

Deno.test("account-update: sends billToContact when a bill-to field is provided", async () => {
  const { ctx, calls } = mockCtx([one({ id: "acc1" })], { display });
  await action.execute!({ accountKey: "A1", billToFirstName: "Amy" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.billToContact, { firstName: "Amy" });
});

Deno.test("account-update: never sets Idempotency-Key — Zuora documents it as POST/PATCH only", async () => {
  const { ctx, calls } = mockCtx([one({ id: "acc1" })], {
    display,
    invocationId: "inv-123",
  });
  await action.execute!({ accountKey: "A1", notes: "x" }, ctx);
  assert(!("idempotency-key" in calls[0].headers));
});
