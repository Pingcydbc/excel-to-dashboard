import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// In-memory cache for dashboard stats (TTL: 30 seconds)
const statsCache = new Map<string, { data: any; expiresAt: number }>();

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year") || "all";
    const levelParam = searchParams.get("level") || "all";
    const majorParam = searchParams.get("major") || "all";

    const cacheKey = `stats_${yearParam}_${levelParam}_${majorParam}`;
    const cached = statsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(
        { success: true, data: cached.data, cached: true, responseTimeMs: Date.now() - startTime },
        {
          headers: {
            "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
          },
        }
      );
    }

    // Profile Status filters
    const profileWhere: any = {};
    if (levelParam !== "all") {
      profileWhere.educationLevel = { contains: levelParam };
    }
    if (majorParam !== "all") {
      profileWhere.major = { contains: majorParam };
    }

    // Graduate filters
    const gradWhere: any = {};
    if (yearParam !== "all") {
      const parsedYear = parseInt(yearParam, 10);
      if (!isNaN(parsedYear)) {
        gradWhere.gradYear = parsedYear;
      }
    }
    if (levelParam !== "all") {
      gradWhere.educationLevel = { contains: levelParam };
    }
    if (majorParam !== "all") {
      gradWhere.major = { contains: majorParam };
    }

    // Single Query for Profile Stats Aggregation
    const profileStatsPromise = (async () => {
      // Build condition for SQL query
      let whereClause = "WHERE 1=1";
      const params: any[] = [];
      let pIdx = 1;

      if (levelParam !== "all") {
        whereClause += ` AND "educationLevel" ILIKE $${pIdx++}`;
        params.push(`%${levelParam}%`);
      }
      if (majorParam !== "all") {
        whereClause += ` AND "major" ILIKE $${pIdx++}`;
        params.push(`%${majorParam}%`);
      }

      const sql = `
        SELECT 
          COUNT(*)::int as "totalStudents",
          COUNT(*) FILTER (WHERE completeness >= 80)::int as "completedStudents",
          COUNT(*) FILTER (WHERE completeness >= 50 AND completeness < 80)::int as "mediumStudents",
          COUNT(*) FILTER (WHERE completeness < 50)::int as "lowStudents",
          COALESCE(AVG(completeness), 0)::float as "avgCompleteness",
          COUNT(*) FILTER (WHERE completeness <= 20)::int as "tier0_20",
          COUNT(*) FILTER (WHERE completeness > 20 AND completeness <= 50)::int as "tier21_50",
          COUNT(*) FILTER (WHERE completeness > 50 AND completeness < 80)::int as "tier51_79"
        FROM "StudentProfileStatus"
        ${whereClause}
      `;

      try {
        const rows: any[] = await prisma.$queryRawUnsafe(sql, ...params);
        const row = rows[0] || {};
        const total = row.totalStudents || 0;
        const completed = row.completedStudents || 0;
        const medium = row.mediumStudents || 0;
        const low = row.lowStudents || 0;
        const avg = Math.round((row.avgCompleteness || 0) * 10) / 10;
        const t0_20 = row.tier0_20 || 0;
        const t21_50 = row.tier21_50 || 0;
        const t51_79 = row.tier51_79 || 0;
        const t80_100 = completed;

        return {
          totalStudents: total,
          completedStudents: completed,
          mediumStudents: medium,
          lowStudents: low,
          avgCompleteness: avg,
          completenessRate: total > 0 ? (completed / total) * 100 : 0,
          distribution: [
            { range: "0 - 20%", count: t0_20, color: "#ef4444" },
            { range: "21 - 50%", count: t21_50, color: "#f97316" },
            { range: "51 - 79%", count: t51_79, color: "#eab308" },
            { range: "80 - 100%", count: t80_100, color: "#10b981" },
          ],
        };
      } catch {
        // Fallback to standard Prisma if raw query encounters any issue
        const total = await prisma.studentProfileStatus.count({ where: profileWhere });
        const completed = await prisma.studentProfileStatus.count({
          where: { ...profileWhere, completeness: { gte: 80 } },
        });
        const medium = await prisma.studentProfileStatus.count({
          where: { ...profileWhere, completeness: { gte: 50, lt: 80 } },
        });
        const low = await prisma.studentProfileStatus.count({
          where: { ...profileWhere, completeness: { lt: 50 } },
        });
        const avgAgg = await prisma.studentProfileStatus.aggregate({
          where: profileWhere,
          _avg: { completeness: true },
        });
        return {
          totalStudents: total,
          completedStudents: completed,
          mediumStudents: medium,
          lowStudents: low,
          avgCompleteness: Math.round((avgAgg._avg.completeness || 0) * 10) / 10,
          completenessRate: total > 0 ? (completed / total) * 100 : 0,
          distribution: [
            { range: "0 - 20%", count: low, color: "#ef4444" },
            { range: "21 - 50%", count: low, color: "#f97316" },
            { range: "51 - 79%", count: medium, color: "#eab308" },
            { range: "80 - 100%", count: completed, color: "#10b981" },
          ],
        };
      }
    })();

    // Run all database operations in parallel
    const [
      profileStats,
      totalGraduates,
      statusGroups,
      matchGroups,
      salaryGroups,
      majorsData,
      companyGroups,
      availableYears,
      availableMajors,
    ] = await Promise.all([
      profileStatsPromise,
      prisma.graduateTracking.count({ where: gradWhere }),
      prisma.graduateTracking.groupBy({
        by: ["trackingStatus"],
        where: gradWhere,
        _count: { _all: true },
      }),
      prisma.graduateTracking.groupBy({
        by: ["jobMajorMatch"],
        where: {
          ...gradWhere,
          OR: [{ trackingStatus: { contains: "มีงานทำ" } }, { companyName: { not: "" } }],
        },
        _count: { _all: true },
      }),
      prisma.graduateTracking.groupBy({
        by: ["salaryRange"],
        where: {
          ...gradWhere,
          salaryRange: { not: null },
        },
        _count: { _all: true },
      }),
      prisma.graduateTracking.groupBy({
        by: ["major", "jobMajorMatch"],
        where: {
          ...gradWhere,
          major: { not: null },
          OR: [{ trackingStatus: { contains: "มีงานทำ" } }, { companyName: { not: "" } }],
        },
        _count: { _all: true },
      }),
      prisma.graduateTracking.groupBy({
        by: ["companyName"],
        where: {
          ...gradWhere,
          companyName: { not: null },
        },
        _count: { companyName: true },
      }),
      prisma.graduateTracking.findMany({
        select: { gradYear: true },
        distinct: ["gradYear"],
        orderBy: { gradYear: "desc" },
        take: 10,
      }),
      prisma.studentProfileStatus.findMany({
        select: { major: true },
        where: { major: { not: null } },
        distinct: ["major"],
        take: 50,
      }),
    ]);

    // Process Graduate Status
    let employedCount = 0;
    let studyCount = 0;
    let unemployedCount = 0;
    let militaryCount = 0;
    let otherStatusCount = 0;

    statusGroups.forEach((g) => {
      const s = g.trackingStatus || "ว่างงาน";
      const count = g._count._all;
      if (s.includes("มีงานทำ") || s.includes("ทำงาน")) {
        employedCount += count;
      } else if (s.includes("ศึกษาต่อ") || s.includes("เรียนต่อ")) {
        studyCount += count;
      } else if (s.includes("เกณฑ์ทหาร")) {
        militaryCount += count;
      } else if (s.includes("ว่างงาน")) {
        unemployedCount += count;
      } else {
        otherStatusCount += count;
      }
    });

    const employmentRate = totalGraduates > 0 ? (employedCount / totalGraduates) * 100 : 0;
    const studyRate = totalGraduates > 0 ? (studyCount / totalGraduates) * 100 : 0;

    const statusChartData = [
      { name: "มีงานทำ", value: employedCount, color: "#10b981" },
      { name: "ศึกษาต่อ", value: studyCount, color: "#3b82f6" },
      { name: "ว่างงาน", value: unemployedCount, color: "#f43f5e" },
      { name: "เกณฑ์ทหาร/อื่นๆ", value: militaryCount + otherStatusCount, color: "#8b5cf6" },
    ].filter((d) => d.value > 0);

    // Process Job Match
    let jobMatchedCount = 0;
    let jobNotMatchedCount = 0;

    matchGroups.forEach((g) => {
      const m = g.jobMajorMatch || "";
      const count = g._count._all;
      if (m.includes("ตรงสาย") || m === "ตรง") {
        jobMatchedCount += count;
      } else if (m.includes("ไม่ตรงสาย") || m === "ไม่ตรง") {
        jobNotMatchedCount += count;
      }
    });

    const totalEmployedWithMatch = jobMatchedCount + jobNotMatchedCount;
    const matchRate = totalEmployedWithMatch > 0 ? (jobMatchedCount / totalEmployedWithMatch) * 100 : 0;

    // Process Salary Distribution
    const salaryMap: Record<string, number> = {
      "ต่ำกว่า 9,000": 0,
      "9,001 - 15,000": 0,
      "15,001 - 25,000": 0,
      "มากกว่า 25,000": 0,
    };

    salaryGroups.forEach((g) => {
      const sal = g.salaryRange || "";
      const count = g._count._all;
      if (!sal) return;
      if (sal.includes("ต่ำกว่า") || sal.includes("< 9,000")) {
        salaryMap["ต่ำกว่า 9,000"] += count;
      } else if (sal.includes("9,001") || sal.includes("9001")) {
        salaryMap["9,001 - 15,000"] += count;
      } else if (sal.includes("15,001") || sal.includes("20,001") || sal.includes("15001")) {
        salaryMap["15,001 - 25,000"] += count;
      } else if (sal.includes("25,001") || sal.includes("30,000") || sal.includes("มากกว่า")) {
        salaryMap["มากกว่า 25,000"] += count;
      } else {
        salaryMap["9,001 - 15,000"] += count;
      }
    });

    const salaryChartData = Object.entries(salaryMap).map(([range, count]) => ({
      range,
      count,
    }));

    // Process Major Match Chart
    const majorMap: Record<string, { major: string; matched: number; notMatched: number; total: number }> = {};
    majorsData.forEach((item) => {
      const mName = item.major || "ไม่ระบุ";
      if (!majorMap[mName]) {
        majorMap[mName] = { major: mName, matched: 0, notMatched: 0, total: 0 };
      }
      const matchStr = item.jobMajorMatch || "";
      if (matchStr.includes("ตรง") && !matchStr.includes("ไม่ตรง")) {
        majorMap[mName].matched += item._count._all;
      } else {
        majorMap[mName].notMatched += item._count._all;
      }
      majorMap[mName].total += item._count._all;
    });

    const majorMatchChartData = Object.values(majorMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // Process Companies
    const validCompanies = companyGroups
      .filter((c) => c.companyName && c.companyName.trim() !== "" && c.companyName !== "-")
      .sort((a, b) => (b._count.companyName || 0) - (a._count.companyName || 0));

    const totalUniqueCompanies = validCompanies.length;
    const topCompaniesRaw = validCompanies.slice(0, 10);

    const topCompanies = topCompaniesRaw.map((c) => ({
      companyName: c.companyName!,
      count: c._count.companyName || 0,
      topPosition: "พนักงาน / ปฏิบัติงาน",
      primaryMajor: "ทั่วไป",
      sampleSalary: "9,001 - 15,000",
    }));

    const responseData = {
      // Pillar 1: Profile Completeness
      profileStats,
      // Pillar 2: Employment Status
      employmentStats: {
        totalGraduates,
        employedCount,
        employmentRate: Math.round(employmentRate * 10) / 10,
        studyCount,
        studyRate: Math.round(studyRate * 10) / 10,
        unemployedCount,
        militaryCount,
        jobMatchedCount,
        jobNotMatchedCount,
        matchRate: Math.round(matchRate * 10) / 10,
        statusChartData,
        salaryChartData,
        majorMatchChartData,
      },
      // Pillar 3: Company & Employer Analytics
      companyStats: {
        totalUniqueCompanies,
        topCompanies,
      },
      // Metadata for Filters
      filters: {
        years: availableYears.map((y) => y.gradYear).filter(Boolean),
        majors: availableMajors.map((m) => m.major).filter(Boolean) as string[],
      },
    };

    // Store in cache for 30s
    statsCache.set(cacheKey, {
      data: responseData,
      expiresAt: Date.now() + 30000,
    });

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        cached: false,
        responseTimeMs: Date.now() - startTime,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    console.error("Dashboard Stats API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
