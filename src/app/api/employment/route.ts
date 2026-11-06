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

    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { studentId: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
          { companyName: { contains: search, mode: "insensitive" } },
          { jobPosition: { contains: search, mode: "insensitive" } },
          { instituteName: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (year && year !== "all") {
      const parsedYear = parseInt(year, 10);
      if (!isNaN(parsedYear)) andConditions.push({ gradYear: parsedYear });
    }

    if (level && level !== "all") {
      if (level.includes("ตรี") || level.includes("ปริญญา")) {
        andConditions.push({
          OR: [
            { educationLevel: { contains: "ป.ตรี" } },
            { educationLevel: { contains: "ปริญญา" } },
            { educationLevel: { contains: "ทล.บ." } },
          ],
        });
      } else {
        andConditions.push({ educationLevel: { contains: level } });
      }
    }

    if (major && major !== "all") {
      andConditions.push({ major: { contains: major } });
    }

    if (status && status !== "all") {
      andConditions.push({ trackingStatus: { contains: status } });
    }

    if (match && match !== "all") {
      if (match === "ไม่ตรง" || match === "ไม่ตรงสาย") {
        andConditions.push({
          OR: [
            { jobMajorMatch: { contains: "ไม่ตรง" } },
            { studyMajorMatch: { contains: "ไม่ตรง" } },
          ],
        });
      } else if (match === "ตรง" || match === "ตรงสาย") {
        andConditions.push({
          OR: [
            {
              AND: [
                { jobMajorMatch: { contains: "ตรง" } },
                { NOT: { jobMajorMatch: { contains: "ไม่ตรง" } } },
              ],
            },
            {
              AND: [
                { studyMajorMatch: { contains: "ตรง" } },
                { NOT: { studyMajorMatch: { contains: "ไม่ตรง" } } },
              ],
            },
          ],
        });
      }
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

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
