import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-create.ts";

Deno.test("person-create: POSTs /people with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const result = await action.execute!(
    { firstName: "Ada", lastName: "Lovelace", emailAddress: "ada@x.io", accountId: 3 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/people");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.first_name, "Ada");
  assertEquals(body.last_name, "Lovelace");
  assertEquals(body.email_address, "ada@x.io");
  assertEquals(body.account_id, 3);
  assertEquals(result, { data: { id: 1 } });
});

Deno.test("person-create: merges additionalFields into the payload", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  await action.execute!(
    { firstName: "Ada", additionalFields: { city: "London", custom_fields: { vip: "yes" } } },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.city, "London");
  assertEquals(body.custom_fields, { vip: "yes" });
});

Deno.test("person-create: omits unset optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  await action.execute!({ firstName: "Ada" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body), ["first_name"]);
});
