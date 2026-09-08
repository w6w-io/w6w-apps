import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import action from "../../actions/contact-get.ts";
import { mockMoneybirdCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: GETs /:administration_id/contacts/:id.json", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ body: { id: "c1", company_name: "Acme" } }]);
  const out = await action.execute({ id: "c1" }, ctx) as { company_name: string };
  assertEquals(pathOf(calls[0].url), "/api/v2/123/contacts/c1.json");
  assertEquals(out.company_name, "Acme");
});

Deno.test("contact-get: throws with the vendor's record-not-found message on a 404", async () => {
  const { ctx } = mockMoneybirdCtx([{
    status: 404,
    body: { error: "Record not found for model name: Contact" },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(action.execute({ id: "nope" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Record not found for model name: Contact"), true, err.message);
});

Deno.test("contact-get: throws when no administration can be resolved", () => {
  const { ctx } = mockMoneybirdCtx([], {});
  assertThrows(
    () => action.execute({ id: "c1" }, ctx),
    Error,
    "No Moneybird administration_id resolved",
  );
});
