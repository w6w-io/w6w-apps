import { assertEquals } from "@std/assert";
import numberGet from "../../actions/number-get.ts";
import { entityBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("number-get: reads GET /v1/numbers/{id} and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: entityBody("number", { id: 1234, availability_status: "custom" }) },
  ]);
  const out = await numberGet.execute({ numberId: "1234" }, ctx) as {
    availability_status: string;
  };

  assertEquals(pathOf(calls[0].url), "/v1/numbers/1234");
  assertEquals(out.availability_status, "custom");
});
