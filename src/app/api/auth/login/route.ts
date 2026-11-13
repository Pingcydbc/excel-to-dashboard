import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลและรหัสผ่าน" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const envAdminEmail = (process.env.ADMIN_EMAIL || "admin@gmail.com").trim().toLowerCase();
    const envAdminPassword = process.env.ADMIN_PASSWORD || "admincmtcvcop123";
    const envReportEmail = (process.env.REPORT_EMAIL || "report@gmail.com").trim().toLowerCase();
    const envReportPassword = process.env.REPORT_PASSWORD || "reportcmtcvcop123";

    let admin = await prisma.adminUser.findUnique({
      where: { email: cleanEmail },
    });

    // Auto-create or sync initial accounts if matching env credentials
    if (!admin) {
      if (cleanEmail === envAdminEmail && password === envAdminPassword) {
        const hashedPassword = hashPassword(envAdminPassword);
        admin = await prisma.adminUser.create({
          data: {
            email: envAdminEmail,
            password: hashedPassword,
            name: "ผู้ดูแลระบบ (Admin)",
            role: "ADMIN",
          },
        });
      } else if (cleanEmail === envReportEmail && password === envReportPassword) {
        const hashedPassword = hashPassword(envReportPassword);
        admin = await prisma.adminUser.create({
          data: {
            email: envReportEmail,
            password: hashedPassword,
            name: "ผู้ดูและพิมพ์รายงาน (Report)",
            role: "REPORT",
          },
        });
      }
    }

    if (!admin) {
      return NextResponse.json(
        { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const isValid = comparePassword(password, admin.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });

    const forwardedProto = req.headers.get("x-forwarded-proto");
    const isHttps =
      forwardedProto === "https" || req.nextUrl.protocol === "https:";

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 }
    );
  }
}
