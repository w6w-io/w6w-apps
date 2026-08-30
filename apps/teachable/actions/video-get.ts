import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/**
 * `GET /v1/courses/{course_id}/lectures/{lecture_id}/videos/{video_id}` —
 * streaming URL and status for a specific video attachment.
 */
interface Input {
  courseId: number;
  lectureId: number;
  videoId: number;
  userId?: number;
}

const videoGet: ActionDefinition<Input> = {
  key: "video-get",
  type: "read",
  resource: "video",
  title: "Get Video",
  description: "Fetch a specific video's playback URL, status and duration.",
  params: [
    { key: "courseId", label: "Course ID", type: "number", required: true },
    { key: "lectureId", label: "Lecture ID", type: "number", required: true },
    { key: "videoId", label: "Video (attachment) ID", type: "number", required: true },
    {
      key: "userId",
      label: "Watching user ID",
      type: "number",
      hint: "Optionally specify which user is watching, for view tracking.",
    },
  ],
  output: [
    { key: "video", type: "object", label: "Video" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json(
      `/courses/${input.courseId}/lectures/${input.lectureId}/videos/${input.videoId}`,
      { query: { user_id: input.userId } },
    );
  },
};

export default videoGet;
