"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  UserCheck, 
  Briefcase, 
  Building2, 
  UploadCloud, 
  LogOut, 
  ShieldCheck,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check admin authentication state
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      })
      .catch(() => setIsAdmin(false));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAdmin(false);
      window.location.href = "/";
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { href: "/", label: "ภาพรวมแดชบอร์ด", icon: LayoutDashboard },
    { href: "/profile-status", label: "สถานะการปรับปรุงข้อมูล", icon: UserCheck },
    { href: "/employment", label: "สถานะการมีงานทำ", icon: Briefcase },
    { href: "/companies", label: "ข้อมูลสถานประกอบการ", icon: Building2 },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="ตราวิทยาลัยเทคนิคเชียงใหม่"
                  className="w-11 h-11 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-indigo-600 transition tracking-tight leading-tight">
                  V-COP CMTC <span className="text-indigo-600">Dashboard</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-block">
                  วิทยาลัยเทคนิคเชียงใหม่
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 shadow-sm font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Admin Action Button */}
          <div className="hidden md:flex items-center gap-2">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/upload"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition ${
                    pathname === "/admin/upload"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  จัดการไฟล์ Excel
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ออก
                </button>
              </div>
            ) : (
              <Link
                href="/admin/login"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-indigo-600 transition shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                เข้าสู่ระบบ Admin
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 px-4 pt-2 pb-4 space-y-1 bg-white">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4 text-indigo-600" />
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100">
            {isAdmin ? (
              <div className="flex items-center justify-between pt-1">
                <Link
                  href="/admin/upload"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-medium text-emerald-700"
                >
                  <UploadCloud className="w-4 h-4" /> จัดการไฟล์ Excel (Admin)
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-600 hover:underline"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-sm font-medium text-slate-800"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> เข้าสู่ระบบ Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
