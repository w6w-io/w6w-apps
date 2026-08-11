import { assertEquals, assertRejects } from "@std/assert";
import projectUpdate from "../../actions/project-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-update: PUTs only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await projectUpdate.execute({ projectId: "1", name: "Renamed" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { name: "Renamed" });
});

Deno.test("project-update: maps the address group to the vendor's snake_case keys", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await projectUpdate.execute({
    projectId: "1",
    address: { street1: "1 Main", street2: "Apt 2", city: "Lincoln" },
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    address: { street_address_1: "1 Main", street_address_2: "Apt 2", city: "Lincoln" },
  });
});

Deno.test("project-update: refuses an empty update instead of sending one", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await projectUpdate.execute({ projectId: "1" }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("project-update: is idempotent — a PUT states the whole of what it names", () => {
  assertEquals(projectUpdate.idempotent, true);
});
