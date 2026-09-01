import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/data-create.ts";

const display = { baseUrl: "https://myapp.bubbleapps.io" };

Deno.test("data-create: POSTs the fields as JSON and returns {status, id}", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { status: "success", id: "1x1" } },
  ], { display });

  const out = await action.execute({
    type: "Rental Unit",
    fields: { "Unit name": "Unit A", "Unit number": 3 },
  }, ctx);

  assertEquals(calls[0].url, "https://myapp.bubbleapps.io/api/1.1/obj/rentalunit");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { "Unit name": "Unit A", "Unit number": 3 });
  assertEquals(out, { status: "success", id: "1x1" });
});

Deno.test("data-create: rejects fields that are not a JSON object", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ type: "thing", fields: "[1,2,3]" }, ctx);
  });
});

Deno.test("data-create: is declared not idempotent", () => {
  assertEquals(action.idempotent, false);
});
