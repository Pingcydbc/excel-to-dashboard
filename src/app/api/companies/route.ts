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

    // Enrich companies with a single batch query
    const companyNames = paginatedCompanies.map((c) => c.companyName!).filter(Boolean);
    const records = await prisma.graduateTracking.findMany({
      where: { ...where, companyName: { in: companyNames } },
      select: {
        companyName: true,
        jobPosition: true,
        major: true,
        salaryRange: true,
        jobMajorMatch: true,
        educationLevel: true,
      },
    });

    const recordsByCompany = new Map<string, any[]>();
    for (const r of records) {
      if (!r.companyName) continue;
      if (!recordsByCompany.has(r.companyName)) {
        recordsByCompany.set(r.companyName, []);
      }
      recordsByCompany.get(r.companyName)!.push(r);
    }

    const enrichedCompanies = paginatedCompanies.map((c) => {
      const name = c.companyName!;
      const compRecords = recordsByCompany.get(name) || [];
      const positions = Array.from(new Set(compRecords.map((r) => r.jobPosition).filter(Boolean))) as string[];
      const majors = Array.from(new Set(compRecords.map((r) => r.major).filter(Boolean))) as string[];
      const matchedCount = compRecords.filter(
        (r) => r.jobMajorMatch && r.jobMajorMatch.includes("ตรง") && !r.jobMajorMatch.includes("ไม่ตรง")
      ).length;
      const matchRate = compRecords.length > 0 ? Math.round((matchedCount / compRecords.length) * 1000) / 10 : 0;
      const sampleSalary = compRecords.find((r) => r.salaryRange)?.salaryRange || "-";

      return {
        companyName: name,
        hiredCount: c._count._all,
        positions: positions.slice(0, 3),
        majors: majors.slice(0, 3),
        matchRate,
        sampleSalary,
      };
    });

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
