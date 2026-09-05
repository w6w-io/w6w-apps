import { assertEquals } from "@std/assert";
import projectCreate from "../../actions/project-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-create: POST /projects with the name and optional fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 5, name: "Launch" } }]);
  const out = await projectCreate.execute(
    { name: "Launch", notes: "Q4 launch", shareMode: 1 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/projects");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Launch", notes: "Q4 launch", share_mode: 1 });
  assertEquals(out, { id: 5, name: "Launch" });
});

Deno.test("project-create: omits unset optional fields from the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 6, name: "Bare" } }]);
  await projectCreate.execute({ name: "Bare" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Bare" });
});
