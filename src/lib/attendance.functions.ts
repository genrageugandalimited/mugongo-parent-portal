import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  student_id: z.string().uuid(),
  stream_id: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.string().min(1).max(30),
});

// Replaces the old attendance-save backend task: only signed-in teachers/admins may mark attendance.
export const saveAttendance = createServerFn({ method: "POST" })
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data }) => {
    const { getPortalSession } = await import("./auth-session.server");
    const session = await getPortalSession();
    const role = session.data.role;
    const userId = session.data.userId;
    if (!userId || (role !== "teacher" && role !== "admin")) {
      return { error: "Please sign in as a teacher to mark attendance." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("attendance_records")
      .upsert({ ...data, marked_by: userId }, { onConflict: "student_id,date" });
    if (error) {
      console.error("saveAttendance", error);
      return { error: "Could not save attendance." };
    }
    return { error: null };
  });
