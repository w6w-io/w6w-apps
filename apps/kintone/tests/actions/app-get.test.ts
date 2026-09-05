import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/app-get.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

Deno.test("app-get: GETs /k/v1/app.json?id=... (not `app=`)", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { appId: "1", code: "", name: "ToDo App" } }],
    conn,
  );
  const out = await action.execute({ appId: "1" }, ctx);
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/v1/app.json?id=1");
  assertEquals(out.name, "ToDo App");
});
