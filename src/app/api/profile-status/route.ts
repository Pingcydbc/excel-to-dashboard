import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const search = searchParams.get("search") || "";
    const level = searchParams.get("level") || "";
    const major = searchParams.get("major") || "";
    const completenessTier = searchParams.get("tier") || ""; // 'completed' (>=80), 'medium' (50-79), 'low' (<50)
    const exportAll = searchParams.get("export") === "true";

    const where: any = {};

    if (search) {
      where.OR = [
        { studentId: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { major: { contains: search, mode: "insensitive" } },
      ];
    }

    if (level && level !== "all") {
      where.educationLevel = { contains: level };
    }

    if (major && major !== "all") {
      where.major = { contains: major };
    }

    if (completenessTier === "completed") {
      where.completeness = { gte: 80 };
    } else if (completenessTier === "medium") {
      where.completeness = { gte: 50, lt: 80 };
    } else if (completenessTier === "low") {
      where.completeness = { lt: 50 };
    }

    const [total, students] = await Promise.all([
      prisma.studentProfileStatus.count({ where }),
      prisma.studentProfileStatus.findMany({
        where,
        orderBy: [{ completeness: "desc" }, { studentId: "asc" }],
        skip: exportAll ? 0 : (page - 1) * limit,
        take: exportAll ? 5000 : limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
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
