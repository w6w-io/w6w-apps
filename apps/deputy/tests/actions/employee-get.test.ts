import { assertEquals } from "@std/assert";
import action from "../../actions/employee-get.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("employee-get: GETs /resource/Employee/{id}", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { Id: 42, FirstName: "Ada" } }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({ id: 42 }, ctx);
  assertEquals(out, { Id: 42, FirstName: "Ada" });
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Employee/42`);
});

Deno.test("employee-get: id param is required, integer, min 1", () => {
  const idParam = action.params!.find((p) => p.key === "id")!;
  assertEquals(idParam.required, true);
  assertEquals(idParam.validation, { integer: true, min: 1 });
});
