import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const levelParam = searchParams.get("level");
    const majorParam = searchParams.get("major");

    // Profile Status filters
    const profileWhere: any = {};
    if (levelParam && levelParam !== "all") {
      profileWhere.educationLevel = { contains: levelParam };
    }
    if (majorParam && majorParam !== "all") {
      profileWhere.major = { contains: majorParam };
    }

    // Graduate filters
    const gradWhere: any = {};
    if (yearParam && yearParam !== "all") {
      const parsedYear = parseInt(yearParam, 10);
      if (!isNaN(parsedYear)) {
        gradWhere.gradYear = parsedYear;
      }
    }
    if (levelParam && levelParam !== "all") {
      gradWhere.educationLevel = { contains: levelParam };
    }
    if (majorParam && majorParam !== "all") {
      gradWhere.major = { contains: majorParam };
    }

    // 1. Fetch Student Profile Stats
    const totalStudents = await prisma.studentProfileStatus.count({ where: profileWhere });
    const completedStudents = await prisma.studentProfileStatus.count({
      where: { ...profileWhere, completeness: { gte: 80 } },
    });
    const mediumStudents = await prisma.studentProfileStatus.count({
      where: { ...profileWhere, completeness: { gte: 50, lt: 80 } },
    });
    const lowStudents = await prisma.studentProfileStatus.count({
      where: { ...profileWhere, completeness: { lt: 50 } },
    });

    const avgCompletenessAgg = await prisma.studentProfileStatus.aggregate({
      where: profileWhere,
      _avg: { completeness: true },
    });
    const avgCompleteness = avgCompletenessAgg._avg.completeness || 0;

    // Completeness tier distribution
    const tier0_20 = await prisma.studentProfileStatus.count({
      where: { ...profileWhere, completeness: { lte: 20 } },
    });
    const tier21_50 = await prisma.studentProfileStatus.count({
      where: { ...profileWhere, completeness: { gt: 20, lte: 50 } },
    });
    const tier51_79 = await prisma.studentProfileStatus.count({
      where: { ...profileWhere, completeness: { gt: 50, lt: 80 } },
    });
    const tier80_100 = completedStudents;

    const completenessDistribution = [
      { range: "0 - 20%", count: tier0_20, color: "#ef4444" },
      { range: "21 - 50%", count: tier21_50, color: "#f97316" },
      { range: "51 - 79%", count: tier51_79, color: "#eab308" },
      { range: "80 - 100%", count: tier80_100, color: "#10b981" },
    ];

    // 2. Fetch Graduate Tracking Stats
    const totalGraduates = await prisma.graduateTracking.count({ where: gradWhere });
    
    // Group by trackingStatus
    const statusGroups = await prisma.graduateTracking.groupBy({
      by: ["trackingStatus"],
      where: gradWhere,
      _count: { _all: true },
    });

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

    // Job Match stats (ตรงสาย vs ไม่ตรงสาย)
    const matchGroups = await prisma.graduateTracking.groupBy({
      by: ["jobMajorMatch"],
      where: {
        ...gradWhere,
        OR: [{ trackingStatus: { contains: "มีงานทำ" } }, { companyName: { not: "" } }],
      },
      _count: { _all: true },
    });

    let jobMatchedCount = 0;
    let jobNotMatchedCount = 0;
    let jobMatchUnspecified = 0;

    matchGroups.forEach((g) => {
      const m = g.jobMajorMatch || "";
      const count = g._count._all;
      if (m.includes("ตรงสาย") || m === "ตรง") {
        jobMatchedCount += count;
      } else if (m.includes("ไม่ตรงสาย") || m === "ไม่ตรง") {
        jobNotMatchedCount += count;
      } else {
        jobMatchUnspecified += count;
      }
    });

    const totalEmployedWithMatch = jobMatchedCount + jobNotMatchedCount;
    const matchRate = totalEmployedWithMatch > 0 ? (jobMatchedCount / totalEmployedWithMatch) * 100 : 0;

    // Salary Distribution
    const salaryGroups = await prisma.graduateTracking.groupBy({
      by: ["salaryRange"],
      where: {
        ...gradWhere,
        salaryRange: { not: null },
      },
      _count: { _all: true },
    });

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

    // Major vs Job Match Grouped Bar Chart (Top 8 Majors)
    const majorsData = await prisma.graduateTracking.groupBy({
      by: ["major", "jobMajorMatch"],
      where: {
        ...gradWhere,
        major: { not: null },
        OR: [{ trackingStatus: { contains: "มีงานทำ" } }, { companyName: { not: "" } }],
      },
      _count: { _all: true },
    });

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

    // 3. Company & Employer Analytics
    // Fetch unique companies with student count
    const companyGroups = await prisma.graduateTracking.groupBy({
      by: ["companyName"],
      where: {
        ...gradWhere,
        companyName: { not: null },
      },
      _count: { _all: true },
      orderBy: {
        _count: {
          companyName: "desc",
        },
      },
    });

    const validCompanies = companyGroups.filter(
      (c) => c.companyName && c.companyName.trim() !== "" && c.companyName !== "-"
    );

    const totalUniqueCompanies = validCompanies.length;

    // Top 10 Hiring Companies
    const topCompaniesRaw = validCompanies.slice(0, 10);
    const topCompanies = await Promise.all(
      topCompaniesRaw.map(async (c) => {
        const companyName = c.companyName!;
        const sampleRecord = await prisma.graduateTracking.findFirst({
          where: { ...gradWhere, companyName },
          select: { jobPosition: true, major: true, salaryRange: true },
        });

        return {
          companyName,
          count: c._count._all,
          topPosition: sampleRecord?.jobPosition || "ไม่ระบุตำแหน่ง",
          primaryMajor: sampleRecord?.major || "ทั่วไป",
          sampleSalary: sampleRecord?.salaryRange || "9,001 - 15,000",
        };
      })
    );

    // Available filter options
    const availableYears = await prisma.graduateTracking.findMany({
      select: { gradYear: true },
      distinct: ["gradYear"],
      orderBy: { gradYear: "desc" },
    });

    const availableMajors = await prisma.studentProfileStatus.findMany({
      select: { major: true },
      where: { major: { not: null } },
      distinct: ["major"],
    });

    return NextResponse.json({
      success: true,
      data: {
        // Pillar 1: Profile Completeness
        profileStats: {
          totalStudents,
          completedStudents,
          mediumStudents,
          lowStudents,
          avgCompleteness: Math.round(avgCompleteness * 10) / 10,
          completenessRate: totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0,
          distribution: completenessDistribution,
        },
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
      },
    });
  } catch (error: any) {
    console.error("Dashboard Stats API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
