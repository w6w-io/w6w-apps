import { assertEquals } from "@std/assert";
import createMatter from "../../actions/create-matter.ts";
import { item, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-matter: POSTs /v1/prospects with only the fields the caller set", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: item("26", "prospect", { first_name: "Bob", last_name: "Owner" }),
  }]);
  const out = await createMatter.execute({ firstName: "Bob", lastName: "Owner" }, ctx) as {
    id: string;
  };

  assertEquals(pathOf(calls[0].url), "/v1/prospects");
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Bob", last_name: "Owner" });
  assertEquals(out.id, "26");
});

Deno.test("create-matter: a company name files the Matter under a Company", async () => {
  const { ctx, calls } = mockCtx([{ body: item("27", "prospect", {}) }]);
  await createMatter.execute(
    { firstName: "Bob", lastName: "Owner", companyName: "Acme Legal" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.company_name, "Acme Legal");
});

Deno.test("create-matter: is marked non-idempotent", () => {
  assertEquals(createMatter.idempotent, false);
});
