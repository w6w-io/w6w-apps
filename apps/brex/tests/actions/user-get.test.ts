import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { errorBody, mockCtx, pathOf, queryOf, USER } from "../_helpers.ts";

Deno.test("user-get: GETs one user by id", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  const result = await userGet.execute({ id: "cu8oi6a6vbc9" }, ctx) as typeof USER;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/users/cu8oi6a6vbc9");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(result.id, "cu8oi6a6vbc9");
});

Deno.test("user-get: a pasted id is escaped, not re-shaped into another path", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  await userGet.execute({ id: "a/b?c" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/users/a%2Fb%3Fc");
});

Deno.test("user-get: load_custom_fields is forwarded when set", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  await userGet.execute({ id: "u1", loadCustomFields: true }, ctx);

  assertEquals(queryOf(calls[0].url), { load_custom_fields: "true" });
});

Deno.test("user-get: a 404 surfaces Brex's own code", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("NOT_FOUND", "Not Found", "USER_NOT_FOUND") },
  ]);
  let message = "";
  try {
    await userGet.execute({ id: "nope" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("code USER_NOT_FOUND"), true);
});

Deno.test("user-get: the required id param is the only one that must be filled", () => {
  assertEquals(userGet.type, "read");
  assertEquals(userGet.params?.filter((p) => p.required).map((p) => p.key), ["id"]);
});
