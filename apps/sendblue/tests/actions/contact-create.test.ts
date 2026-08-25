import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs to /api/v2/contacts using only the preferred snake_case fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", contact: {} } }]);
  await contactCreate.execute({
    number: "+1",
    firstName: "Jane",
    tags: ["vip", "customer"],
    customVariables: '{"Plan":"Enterprise"}',
    updateIfExists: true,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/contacts");
  assertEquals(jsonBodyOf(calls[0]), {
    number: "+1",
    first_name: "Jane",
    tags: ["vip", "customer"],
    custom_variables: { Plan: "Enterprise" },
    update_if_exists: true,
  });
});
