import { assert, assertEquals } from "@std/assert";
import secretCreate from "../../actions/secret-create.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("secret-create: POSTs key/type/value to /secrets", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      secret_id: "secret-1",
      key: "GH_TOKEN",
      secret_type: "key-value",
      is_sensitive: true,
      access_type: "org",
      note: null,
      created_at: 100,
      created_by: "svc-1",
    },
  }]);
  const out = await secretCreate.execute(
    { key: "GH_TOKEN", type: "key-value", value: "ghp_super-secret-value" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/secrets`);
  assertEquals(JSON.parse(calls[0].body!), {
    key: "GH_TOKEN",
    type: "key-value",
    value: "ghp_super-secret-value",
  });
  assertEquals(out.secret_id, "secret-1");
});

Deno.test("secret-create: the created secret's value never appears in the result", async () => {
  const { ctx } = mockCtx([{
    body: {
      secret_id: "secret-1",
      key: "GH_TOKEN",
      secret_type: "key-value",
      is_sensitive: true,
      access_type: "org",
      note: null,
      created_at: 100,
      created_by: "svc-1",
    },
  }]);
  const out = await secretCreate.execute(
    { key: "GH_TOKEN", type: "key-value", value: "ghp_super-secret-value" },
    ctx,
  );
  assert(!JSON.stringify(out).includes("ghp_super-secret-value"));
});

Deno.test("secret-create: is not idempotent", () => {
  assertEquals(secretCreate.idempotent, false);
});

Deno.test("secret-create: the value param is marked secret", () => {
  assertEquals(secretCreate.params?.find((p) => p.key === "value")?.type, "secret");
});
