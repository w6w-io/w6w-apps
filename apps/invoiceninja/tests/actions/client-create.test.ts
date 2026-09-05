import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/client-create.ts";

Deno.test("client-create: POSTs /clients with a one-element contacts array", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "abc" } }]);
  await action.execute(
    { name: "Bob & Co", contactEmail: "bob@acme.test", contactFirstName: "Bob" },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/clients");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Bob & Co");
  assertEquals(body.contacts, [{ first_name: "Bob", email: "bob@acme.test" }]);
});

Deno.test("client-create: sends an empty contact object when no contact fields are given", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "abc" } }]);
  await action.execute({ name: "Bob & Co" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).contacts, [{}]);
});
