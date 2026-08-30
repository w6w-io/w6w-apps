import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import businessGet from "../../actions/business-get.ts";

Deno.test("business-get: returns the business by id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { business: { id: "b1", name: "Smith Consulting", isPersonal: false } } },
  }]);
  const out = await businessGet.execute({ businessId: "b1" }, ctx) as { name: string };
  assertEquals(out.name, "Smith Consulting");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.id, "b1");
});

Deno.test("business-get: a NOT_FOUND error surfaces as a rejection", async () => {
  const { ctx } = mockCtx([{
    body: {
      errors: [{
        message: "Business 'BAD_ID' could not be found.",
        extensions: { code: "NOT_FOUND" },
      }],
      data: { business: null },
    },
  }]);
  await assertRejects(
    async () => {
      await businessGet.execute({ businessId: "BAD_ID" }, ctx);
    },
    Error,
    "could not be found",
  );
});

Deno.test("business-get: type/resource metadata", () => {
  assertEquals(businessGet.type, "read");
  assertEquals(businessGet.resource, "business");
});
