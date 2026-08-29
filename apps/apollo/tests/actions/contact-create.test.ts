import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs a JSON body to /contacts, comma-splitting label_names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { contact: { id: "c1" } } }]);
  const out = await contactCreate.execute(
    { first_name: "Ada", email: "ada@apollo.io", label_names: "VIP, Newsletter", run_dedupe: true },
    ctx,
  ) as { contact: { id: string } };

  assertEquals(pathOf(calls[0].url), "/api/v1/contacts");
  assertEquals(JSON.parse(calls[0].body!), {
    first_name: "Ada",
    email: "ada@apollo.io",
    label_names: ["VIP", "Newsletter"],
    run_dedupe: true,
  });
  assertEquals(out.contact.id, "c1");
});
