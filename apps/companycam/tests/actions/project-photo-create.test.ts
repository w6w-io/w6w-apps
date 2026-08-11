import { assert, assertEquals } from "@std/assert";
import projectPhotoCreate from "../../actions/project-photo-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The photo is created from a hosted URL in a JSON body — no multipart, no
 * binary — which is what makes it expressible from the sandbox at all.
 */
Deno.test("project-photo-create: posts a hosted URL, not file bytes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "5", processing_status: "pending" },
  }]);
  await projectPhotoCreate.execute({
    projectId: "94772883",
    uri: "https://files.example.com/roof.jpg",
    capturedAt: 1637770053,
    description: "North elevation",
    tags: ["roof", "before"],
    lat: 28.42,
    lon: -81.47,
    internal: true,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/projects/94772883/photos");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    photo: {
      uri: "https://files.example.com/roof.jpg",
      captured_at: 1637770053,
      description: "North elevation",
      tags: ["roof", "before"],
      coordinates: { lat: 28.42, lon: -81.47 },
      internal: true,
    },
  });
});

Deno.test("project-photo-create: sends only the two required fields when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await projectPhotoCreate.execute({ projectId: "1", uri: "https://x/y.jpg", capturedAt: 1 }, ctx);
  assertEquals(bodyOf(calls[0]), { photo: { uri: "https://x/y.jpg", captured_at: 1 } });
});

Deno.test("project-photo-create: accepts a comma-separated tag list", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await projectPhotoCreate.execute(
    { projectId: "1", uri: "https://x/y.jpg", capturedAt: 1, tags: "roof, before" },
    ctx,
  );
  assertEquals((bodyOf(calls[0]).photo as { tags: string[] }).tags, ["roof", "before"]);
});

Deno.test("project-photo-create: says captured_at is seconds, and requires it", () => {
  const capturedAt = projectPhotoCreate.params!.find((p) => p.key === "capturedAt")!;
  assertEquals(capturedAt.required, true);
  assert(/SECONDS/.test(capturedAt.hint!), capturedAt.hint);
  assertEquals(projectPhotoCreate.idempotent, false);
});
