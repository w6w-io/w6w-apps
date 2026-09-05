import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/companies-add.ts";

Deno.test("companies-add: POSTs companies.add with the snake_case body and returns id/type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { type: "company", id: "c1" } } }]);
  const out = await action.execute({
    name: "Pied Piper",
    vatNumber: "BE0899623035",
    preferredCurrency: "EUR",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/companies.add");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Pied Piper");
  assertEquals(body.vat_number, "BE0899623035");
  assertEquals(body.preferred_currency, "EUR");
  assertEquals(out, { type: "company", id: "c1" });
});
