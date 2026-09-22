import { assertEquals } from "@std/assert";
import departmentCreate from "../../actions/department-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const DEPARTMENT = { id: "dp_1", name: "Engineering", description: "Product engineering" };

Deno.test("department-create: POSTs name and description", async () => {
  const { ctx, calls } = mockCtx([{ body: DEPARTMENT }]);
  await departmentCreate.execute({ name: "Engineering", description: "Product engineering" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/departments");
  assertEquals(bodyOf(calls[0]), {
    name: "Engineering",
    description: "Product engineering",
  });
});

Deno.test("department-create: an empty description is not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: DEPARTMENT }]);
  await departmentCreate.execute({ name: "Engineering", description: "" }, ctx);

  assertEquals(bodyOf(calls[0]), { name: "Engineering" });
});

Deno.test("department-create: an idempotency key is forwarded verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: DEPARTMENT }]);
  await departmentCreate.execute({ name: "Engineering", idempotencyKey: "k9" }, ctx);

  assertEquals(calls[0].headers["idempotency-key"], "k9");
  assertEquals(departmentCreate.idempotent, false);
});
