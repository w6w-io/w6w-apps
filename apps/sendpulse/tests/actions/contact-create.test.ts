import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: hits POST /contacts/create, not the deprecated /contacts", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  await action.execute!({ responsibleId: 3 }, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/contacts/create");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body ?? ""), { responsibleId: 3 });
});

Deno.test("contact-create: never sends phones/emails/tags/attributes — /contacts/create doesn't accept them", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  await action.execute!({ responsibleId: 3, firstName: "Ada", lastName: "Lovelace" }, ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body, { responsibleId: 3, firstName: "Ada", lastName: "Lovelace" });
});

Deno.test("contact-create: responsibleId is required", () => {
  assertEquals(action.params?.find((p) => p.key === "responsibleId")?.required, true);
});
