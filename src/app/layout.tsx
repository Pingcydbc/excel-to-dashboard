import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  display: "swap",
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "V-COP CMTC Dashboard",
  description: "V-COP CMTC Dashboard ระบบรายงานและวิเคราะห์ข้อมูลสถานะการปรับปรุงข้อมูลนักศึกษา ภาวะการมีงานทำ และสถิติสถานประกอบการ",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={prompt.variable}>
      <body className={`${prompt.className} min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased`}>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-600 no-print mt-auto shadow-inner">
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            <p className="font-medium text-slate-700 leading-relaxed">
              วิทยาลัยเทคนิคเชียงใหม่ เลขที่ 9 ถ.เวียงแก้ว ต.ศรีภูมิ อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50200 โทร. 053-217-708-9
            </p>
            <p className="text-slate-500">
              ออกแบบและพัฒนาโดย{" "}
              <a
                href="http://itc.cmtc.ac.th/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 transition"
              >
                งานศูนย์ดิจิทัลและสื่อสารองค์กร
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
