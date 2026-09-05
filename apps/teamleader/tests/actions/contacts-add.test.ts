import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-add.ts";

Deno.test("contacts-add: POSTs contacts.add with the snake_case body and returns id/type", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { type: "contact", id: "new-1" } },
  }]);
  const out = await action.execute({
    lastName: "Smith",
    firstName: "John",
    emails: [{ type: "primary", email: "john@example.com" }],
    tags: ["prospect"],
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts.add");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.last_name, "Smith");
  assertEquals(body.first_name, "John");
  assertEquals(body.emails, [{ type: "primary", email: "john@example.com" }]);
  assertEquals(body.tags, ["prospect"]);
  assertEquals(out, { type: "contact", id: "new-1" });
});

Deno.test("contacts-add: omits unset optional fields rather than sending them as null/undefined", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { type: "contact", id: "x" } } }]);
  await action.execute({ lastName: "Smith" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body), ["last_name"]);
});
