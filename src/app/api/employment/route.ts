import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const search = searchParams.get("search") || "";
    const year = searchParams.get("year") || "";
    const level = searchParams.get("level") || "";
    const major = searchParams.get("major") || "";
    const status = searchParams.get("status") || "";
    const match = searchParams.get("match") || "";
    const exportAll = searchParams.get("export") === "true";

    const where: any = {};

    if (search) {
      where.OR = [
        { studentId: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { jobPosition: { contains: search, mode: "insensitive" } },
        { instituteName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (year && year !== "all") {
      const parsedYear = parseInt(year, 10);
      if (!isNaN(parsedYear)) where.gradYear = parsedYear;
    }

    if (level && level !== "all") {
      where.educationLevel = { contains: level };
    }

    if (major && major !== "all") {
      where.major = { contains: major };
    }

    if (status && status !== "all") {
      where.trackingStatus = { contains: status };
    }

    if (match && match !== "all") {
      where.jobMajorMatch = { contains: match };
    }

    const [total, graduates] = await Promise.all([
      prisma.graduateTracking.count({ where }),
      prisma.graduateTracking.findMany({
        where,
        orderBy: [{ gradYear: "desc" }, { studentId: "asc" }],
        skip: exportAll ? 0 : (page - 1) * limit,
        take: exportAll ? 5000 : limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
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
