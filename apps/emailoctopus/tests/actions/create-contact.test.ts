import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-contact.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-contact: POSTs to /lists/{id}/contacts with only the email by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1" } }]);
  await action.execute!({ listId: "l1", emailAddress: "otto@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "otto@example.com" });
});

Deno.test("create-contact: sends tags as an ARRAY — the POST shape, not the PUT shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({
    listId: "l1",
    emailAddress: "otto@example.com",
    status: "subscribed",
    fields: { FirstName: "Otto", how_many_pets: 2 },
    tags: ["vip", "beta"],
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(Array.isArray(sent.tags), "POST /contacts takes tags as an array of strings");
  assertEquals(sent.tags, ["vip", "beta"]);
  assertEquals(sent.status, "subscribed");
  assertEquals(sent.fields, { FirstName: "Otto", how_many_pets: 2 });
});

Deno.test("create-contact: is not idempotent — a repeat is an already-exists conflict", async () => {
  assertEquals(action.idempotent, false);
  const { ctx } = mockCtx([{
    status: 409,
    body: {
      title: "An error occurred.",
      detail: "Conflict.",
      status: 409,
      type: "https://emailoctopus.com/api-documentation/v2#already-exists",
    },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(action.execute!({ listId: "l1", emailAddress: "otto@example.com" }, ctx)),
    Error,
  );
  assert(err.message.includes("409"));
  assert(err.message.includes("#already-exists"));
});
