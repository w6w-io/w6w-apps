import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/account-create.ts";

Deno.test("account-create: POSTs the required fields plus the flattened bill-to contact", async () => {
  const { ctx, calls } = mockCtx([one({ id: "acc1", accountNumber: "A00000001" })], { display });
  await action.execute!(
    {
      name: "Acme",
      currency: "USD",
      billToFirstName: "Amy",
      billToLastName: "Lawrence",
    },
    ctx,
  );
  assertEquals(calls[0].url, "https://rest.zuora.com/v1/accounts");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Acme");
  assertEquals(body.currency, "USD");
  assertEquals(body.billToContact, { firstName: "Amy", lastName: "Lawrence" });
});

Deno.test("account-create: omits unset optional fields rather than sending them empty", async () => {
  const { ctx, calls } = mockCtx([one({ id: "acc1" })], { display });
  await action.execute!(
    { name: "Acme", currency: "USD", billToFirstName: "Amy", billToLastName: "Lawrence" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assert(!("crmId" in body));
  assert(!("accountNumber" in body));
});

Deno.test("account-create: sets Idempotency-Key from the invocation id", async () => {
  const { ctx, calls } = mockCtx([one({ id: "acc1" })], {
    display,
    invocationId: "inv-123",
  });
  await action.execute!(
    { name: "Acme", currency: "USD", billToFirstName: "Amy", billToLastName: "Lawrence" },
    ctx,
  );
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("account-create: never sends an authorization header — sign's job, not this action's", async () => {
  const { ctx, calls } = mockCtx([one({ id: "acc1" })], { display });
  await action.execute!(
    { name: "Acme", currency: "USD", billToFirstName: "Amy", billToLastName: "Lawrence" },
    ctx,
  );
  assert(!("authorization" in calls[0].headers));
});
