import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function matchesEnvPassword(inputPassword: string, envPassword: string): boolean {
  if (!envPassword) return false;
  if (inputPassword === envPassword) return true;
  // Handle Portainer / Docker Compose env parser collapsing "$$" into "$"
  if (inputPassword.replace(/\$\$/g, "$") === envPassword) return true;
  return false;
}

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
    const envAdminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const envAdminPassword = process.env.ADMIN_PASSWORD || "";
    const envReportEmail = (process.env.REPORT_EMAIL || "").trim().toLowerCase();
    const envReportPassword = process.env.REPORT_PASSWORD || "";

    let admin = null;

    // Sync directly with environment variables if credentials match .env / Portainer ENV
    if (
      envAdminEmail &&
      envAdminPassword &&
      cleanEmail === envAdminEmail &&
      matchesEnvPassword(password, envAdminPassword)
    ) {
      const hashedPassword = hashPassword(password);
      admin = await prisma.adminUser.upsert({
        where: { email: envAdminEmail },
        update: { password: hashedPassword, role: "ADMIN" },
        create: {
          email: envAdminEmail,
          password: hashedPassword,
          name: "ผู้ดูแลระบบ (Admin)",
          role: "ADMIN",
        },
      });
    } else if (
      envReportEmail &&
      envReportPassword &&
      cleanEmail === envReportEmail &&
      matchesEnvPassword(password, envReportPassword)
    ) {
      const hashedPassword = hashPassword(password);
      admin = await prisma.adminUser.upsert({
        where: { email: envReportEmail },
        update: { password: hashedPassword, role: "REPORT" },
        create: {
          email: envReportEmail,
          password: hashedPassword,
          name: "ผู้ดูและพิมพ์รายงาน (Report)",
          role: "REPORT",
        },
      });
    } else {
      admin = await prisma.adminUser.findUnique({
        where: { email: cleanEmail },
      });
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
