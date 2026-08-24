import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword, signToken } from "@/lib/auth";

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

    let admin = await prisma.adminUser.findUnique({
      where: { email: cleanEmail },
    });

    // Auto-create initial admin on fresh database if matching env credentials
    if (!admin) {
      const adminCount = await prisma.adminUser.count();
      if (adminCount === 0 && cleanEmail === envAdminEmail && password === envAdminPassword) {
        const hashedPassword = hashPassword(envAdminPassword);
        admin = await prisma.adminUser.create({
          data: {
            email: envAdminEmail,
            password: hashedPassword,
            name: "ผู้ดูแลระบบ (Admin)",
            role: "ADMIN",
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

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
