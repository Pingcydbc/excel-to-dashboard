import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Excel to Dashboard | ระบบวิเคราะห์ข้อมูลนักศึกษาและผู้สำเร็จการศึกษา",
  description: "แดชบอร์ดสรุปผลการปรับปรุงข้อมูลนักศึกษา ภาวะการมีงานทำ และสถิติสถานประกอบการ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
          <p>© 2026 Excel to Dashboard • สถาบันการศึกษา / วิทยาลัยอาชีวศึกษา</p>
        </footer>
      </body>
    </html>
  );
}
