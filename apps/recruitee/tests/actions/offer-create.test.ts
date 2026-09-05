import { assertEquals } from "@std/assert";
import offerCreate from "../../actions/offer-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("offer-create: nests fields under `offer`", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { offer: { id: 1 } } }]);
  await offerCreate.execute({ title: "Backend Developer", departmentId: 4 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/c/123/offers");
  assertEquals(JSON.parse(calls[0].body!), {
    offer: { title: "Backend Developer", department_id: 4 },
  });
});
