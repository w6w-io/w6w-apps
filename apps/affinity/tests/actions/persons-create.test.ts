import { assertEquals } from "@std/assert";
import personsCreate from "../../actions/persons-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("persons-create: POSTs first_name/last_name/emails/organization_ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 860197, first_name: "Alice" } }]);
  await personsCreate.execute(
    {
      firstName: "Alice",
      lastName: "Doe",
      emails: "alice@affinity.co",
      organizationIds: "1687449",
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/persons");
  assertEquals(JSON.parse(calls[0].body!), {
    first_name: "Alice",
    last_name: "Doe",
    emails: ["alice@affinity.co"],
    organization_ids: [1687449],
  });
});

Deno.test("persons-create: sends emails: [] (not omitted) when no emails are given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await personsCreate.execute({ firstName: "No", lastName: "Email" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.emails, []);
});
