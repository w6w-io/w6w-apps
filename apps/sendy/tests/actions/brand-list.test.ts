import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/brand-list.ts";

const conn = { display: { baseUrl: "https://example.com/sendy" } };

Deno.test("brand-list: parses the documented JSON success shape, unparameterised", async () => {
  const { ctx, calls } = mockCtx([{ body: JSON.stringify([{ id: "b1", name: "Acme" }]) }], conn);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://example.com/sendy/api/brands/get-brands.php");
  assertEquals(result, { brands: [{ id: "b1", name: "Acme" }] });
  assertEquals(action.params, []);
});

Deno.test("brand-list: a plain-text error is not silently parsed as JSON", async () => {
  const { ctx } = mockCtx([{ body: "No brands found" }], conn);
  await assertRejects(
    async () => await action.execute({}, ctx),
    Error,
    "No brands found",
  );
});
