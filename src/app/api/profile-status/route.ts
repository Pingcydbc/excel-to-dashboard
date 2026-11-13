import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { filterByDefaultCohort, matchesMajorFilter } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const level = searchParams.get("level") || "";
    const major = searchParams.get("major") || "";
    const completenessTier = searchParams.get("tier") || ""; // 'full100', 'below100', 'completed' (>=80), 'medium' (50-79), 'low' (<50)
    const exportAll = searchParams.get("export") === "true";

    // Auto-clean any accidental upload of a Graduate Tracking file into profile_status
    const wrongProfileLogs = await prisma.uploadLog.findMany({
      where: {
        fileType: "profile_status",
        fileName: { contains: "GraduatedStudentJobTracking" },
      },
      select: { id: true },
    });
    if (wrongProfileLogs.length > 0) {
      const wrongIds = wrongProfileLogs.map((l) => l.id);
      await prisma.studentProfileStatus.deleteMany({
        where: { uploadLogId: { in: wrongIds } },
      });
      await prisma.uploadLog.deleteMany({
        where: { id: { in: wrongIds } },
      });
    }

    const allStudents = await prisma.studentProfileStatus.findMany({
      orderBy: [{ completeness: "desc" }, { studentId: "asc" }],
    });

    // 1. Apply Default Cohort Filter from Excel dataset (ปวช. ย้อนหลัง 2 ปี / ปวส. 1 ปี / ป.ตรี 1 ปี)
    const { filtered: cohortStudents, baseYearPrefix } = filterByDefaultCohort(allStudents);

    // 2. Apply UI / Report filters
    const filtered = cohortStudents.filter((s) => {
      if (search) {
        const matchSearch =
          s.studentId.toLowerCase().includes(search) ||
          s.firstName.toLowerCase().includes(search) ||
          s.lastName.toLowerCase().includes(search) ||
          (s.major || "").toLowerCase().includes(search);
        if (!matchSearch) return false;
      }

      if (level && level !== "all") {
        const lv = s.educationLevel || "";
        if (level.includes("ตรี") || level.includes("ปริญญา")) {
          if (!lv.includes("ป.ตรี") && !lv.includes("ปริญญา") && !lv.includes("ทล.บ.")) {
            return false;
          }
        } else if (!lv.includes(level)) {
          return false;
        }
      }

      if (!matchesMajorFilter(s.major, major)) {
        return false;
      }

      const comp = s.completeness || 0;
      if (completenessTier === "full100" && comp < 100) return false;
      if (completenessTier === "below100" && comp >= 100) return false;
      if (completenessTier === "completed" && comp < 80) return false;
      if (completenessTier === "medium" && (comp < 50 || comp >= 80)) return false;
      if (completenessTier === "low" && comp >= 50) return false;

      return true;
    });

    const total = filtered.length;
    const students = exportAll
      ? filtered
      : filtered.slice((page - 1) * limit, (page - 1) * limit + limit);

    return NextResponse.json({
      success: true,
      baseYear: baseYearPrefix ? baseYearPrefix + 2500 : null,
      data: students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
