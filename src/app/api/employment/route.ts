import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchesMajorFilter } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const year = searchParams.get("year") || "";
    const level = searchParams.get("level") || "";
    const major = searchParams.get("major") || "";
    const status = searchParams.get("status") || "";
    const match = searchParams.get("match") || "";
    const exportAll = searchParams.get("export") === "true";

    const allGraduates = await prisma.graduateTracking.findMany({
      orderBy: [{ gradYear: "desc" }, { studentId: "asc" }],
    });

    // แสดงข้อมูลผู้สำเร็จการศึกษาทั้งหมดตามไฟล์ (ไม่ตัดรุ่นรหัสนักศึกษา)
    const cohortGraduates = allGraduates;
    const maxGradYear =
      cohortGraduates.length > 0
        ? Math.max(...cohortGraduates.map((g) => g.gradYear || 0))
        : null;

    const parsedYear = year && year !== "all" ? parseInt(year, 10) : NaN;

    // 2. Apply UI / Report filters
    const filtered = cohortGraduates.filter((g) => {
      if (search) {
        const matchSearch =
          g.studentId.toLowerCase().includes(search) ||
          g.fullName.toLowerCase().includes(search) ||
          (g.companyName || "").toLowerCase().includes(search) ||
          (g.jobPosition || "").toLowerCase().includes(search) ||
          (g.instituteName || "").toLowerCase().includes(search);
        if (!matchSearch) return false;
      }

      if (!isNaN(parsedYear) && g.gradYear !== parsedYear) {
        return false;
      }

      if (level && level !== "all") {
        const lv = g.educationLevel || "";
        if (level.includes("ตรี") || level.includes("ปริญญา")) {
          if (!lv.includes("ป.ตรี") && !lv.includes("ปริญญา") && !lv.includes("ทล.บ.")) {
            return false;
          }
        } else if (!lv.includes(level)) {
          return false;
        }
      }

      if (!matchesMajorFilter(g.major, major)) {
        return false;
      }

      if (status && status !== "all") {
        if (!(g.trackingStatus || "").includes(status)) return false;
      }

      if (match && match !== "all") {
        const jm = g.jobMajorMatch || "";
        const sm = g.studyMajorMatch || "";
        if (match === "ไม่ตรง" || match === "ไม่ตรงสาย") {
          if (!jm.includes("ไม่ตรง") && !sm.includes("ไม่ตรง")) return false;
        } else if (match === "ตรง" || match === "ตรงสาย") {
          const jDirect = jm.includes("ตรง") && !jm.includes("ไม่ตรง");
          const sDirect = sm.includes("ตรง") && !sm.includes("ไม่ตรง");
          if (!jDirect && !sDirect) return false;
        }
      }

      return true;
    });

    const total = filtered.length;
    const graduates = exportAll
      ? filtered
      : filtered.slice((page - 1) * limit, (page - 1) * limit + limit);

    return NextResponse.json({
      success: true,
      baseYear: maxGradYear,
      data: graduates,
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
