import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const search = searchParams.get("search") || "";
    const major = searchParams.get("major") || "";
    const exportAll = searchParams.get("export") === "true";

    const where: any = {
      companyName: { not: null },
      NOT: [{ companyName: "" }, { companyName: "-" }],
    };

    if (search) {
      where.companyName = { contains: search, mode: "insensitive" };
    }

    if (major && major !== "all") {
      where.major = { contains: major };
    }

    // Group by companyName
    const companyGroups = await prisma.graduateTracking.groupBy({
      by: ["companyName"],
      where,
      _count: { _all: true },
      orderBy: {
        _count: {
          companyName: "desc",
        },
      },
    });

    const totalCompanies = companyGroups.length;
    const paginatedCompanies = exportAll
      ? companyGroups
      : companyGroups.slice((page - 1) * limit, page * limit);

    // Enrich each company with details
    const enrichedCompanies = await Promise.all(
      paginatedCompanies.map(async (c) => {
        const name = c.companyName!;
        const records = await prisma.graduateTracking.findMany({
          where: { ...where, companyName: name },
          select: {
            jobPosition: true,
            major: true,
            salaryRange: true,
            jobMajorMatch: true,
            educationLevel: true,
          },
        });

        const positions = Array.from(new Set(records.map((r) => r.jobPosition).filter(Boolean)));
        const majors = Array.from(new Set(records.map((r) => r.major).filter(Boolean)));
        const matchedCount = records.filter(
          (r) => r.jobMajorMatch?.includes("ตรง") && !r.jobMajorMatch?.includes("ไม่ตรง")
        ).length;
        const matchRate = records.length > 0 ? (matchedCount / records.length) * 100 : 0;

        return {
          companyName: name,
          hiredCount: c._count._all,
          positions: positions.slice(0, 3),
          majors: majors.slice(0, 3),
          sampleSalary: records[0]?.salaryRange || "-",
          matchRate: Math.round(matchRate * 10) / 10,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedCompanies,
      pagination: {
        page,
        limit,
        total: totalCompanies,
        totalPages: Math.ceil(totalCompanies / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
