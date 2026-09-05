import { assertEquals } from "@std/assert";
import affiliateCreate from "../../actions/affiliate-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-create: posts firstname/lastname plus optional company/address/custom_fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ramonereferra" } }]);
  const out = await affiliateCreate.execute(
    {
      firstname: "Ramone",
      lastname: "Referra",
      email: "ramona@referra.com",
      company: { name: "Referra Inc." },
      address: {
        address: "Rapenburgerstraat 173",
        postal_code: "1011 VM",
        city: "Amsterdam",
        country: { code: "NL" },
      },
      customFields: { field1: "value1" },
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.6/affiliates/");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.firstname, "Ramone");
  assertEquals(body.company, { name: "Referra Inc." });
  assertEquals(body.custom_fields, { field1: "value1" });
  assertEquals(out, { id: "ramonereferra" });
});
