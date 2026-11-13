"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Printer,
  FileSpreadsheet,
  Filter,
  Search,
  RefreshCw,
  ArrowLeft,
  UserCheck,
  Briefcase,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

export default function AdminReportsPage() {
  const [authUser, setAuthUser] = useState<{
    id: string;
    email: string;
    name: string;
    role: string;
  } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [activeReport, setActiveReport] = useState<"profile" | "graduate">("profile");
  const [printScope, setPrintScope] = useState<"full" | "summary">("full");

  const [level, setLevel] = useState("all");
  const [major, setMajor] = useState("all");
  const [tier, setTier] = useState("all"); // all | full100 | below100
  const [gradStatus, setGradStatus] = useState("all"); // all | มีงานทำ | ศึกษาต่อ | ว่างงาน
  const [search, setSearch] = useState("");

  const [statsMajors, setStatsMajors] = useState<string[]>([]);
  const [allUnfilteredMajors, setAllUnfilteredMajors] = useState<string[]>([]);

  const [profileRecords, setProfileRecords] = useState<any[]>([]);
  const [gradRecords, setGradRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Verify authentication
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || !data.user) {
          window.location.href = "/admin/login";
        } else {
          setAuthUser(data.user);
          setAuthChecking(false);
        }
      })
      .catch(() => {
        window.location.href = "/admin/login";
      });
  }, []);

  // Load filter metadata from /api/dashboard/stats
  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((json) => {
        const filters = json?.data?.filters || json?.filters;
        if (json?.success && filters) {
          const combined = Array.from(
            new Set([
              ...(filters.majors || []),
              ...(filters.profileMajors || []),
              ...(filters.gradMajors || []),
            ])
          )
            .map((m) => String(m || "").trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "th"));
          setStatsMajors(combined);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch data from BOTH files simultaneously
  const fetchReportData = useCallback(async () => {
    if (authChecking) return;
    try {
      setLoading(true);
      const profileParams = new URLSearchParams({
        export: "true",
        level,
        major,
        tier: tier === "all" ? "" : tier,
        search,
      });
      const gradParams = new URLSearchParams({
        export: "true",
        level,
        major,
        status: gradStatus,
        search,
      });

      const [profileRes, gradRes] = await Promise.all([
        fetch(`/api/profile-status?${profileParams.toString()}`),
        fetch(`/api/employment?${gradParams.toString()}`),
      ]);

      const [profileJson, gradJson] = await Promise.all([
        profileRes.json(),
        gradRes.json(),
      ]);

      const pData = profileJson?.success ? profileJson.data || [] : [];
      const gData = gradJson?.success ? gradJson.data || [] : [];

      setProfileRecords(pData);
      setGradRecords(gData);

      // Capture all majors when major === "all" so dropdown stays populated
      if (major === "all") {
        const extracted = Array.from(
          new Set([
            ...pData.map((r: any) => String(r.major || "").trim()),
            ...gData.map((r: any) => String(r.major || "").trim()),
          ])
        )
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "th"));
        if (extracted.length > 0) {
          setAllUnfilteredMajors((prev) =>
            Array.from(new Set([...prev, ...extracted])).sort((a, b) =>
              a.localeCompare(b, "th")
            )
          );
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authChecking, level, major, tier, gradStatus, search]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Combine majors from stats API and fetched records so the dropdown is always populated
  const availableMajors = useMemo(() => {
    return Array.from(new Set([...statsMajors, ...allUnfilteredMajors]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "th"));
  }, [statsMajors, allUnfilteredMajors]);

  // Compute summary metrics from BOTH datasets
  const totalStudents = profileRecords.length;
  const full100Count = profileRecords.filter((r) => (r.completeness || 0) >= 100).length;
  const below100Count = profileRecords.filter((r) => (r.completeness || 0) < 100).length;
  const full100Percent =
    totalStudents > 0 ? ((full100Count / totalStudents) * 100).toFixed(1) : "0.0";
  const below100Percent =
    totalStudents > 0 ? ((below100Count / totalStudents) * 100).toFixed(1) : "0.0";

  const totalGraduates = gradRecords.length;
  const employedCount = gradRecords.filter((g) => {
    const s = String(g.trackingStatus || "");
    return s.includes("มีงานทำ") || s.includes("ทำงาน");
  }).length;
  const jobMatchedCount = gradRecords.filter((g) => {
    const s = String(g.trackingStatus || "");
    const isEmp =
      s.includes("มีงานทำ") ||
      s.includes("ทำงาน") ||
      Boolean(g.companyName && g.companyName.trim() !== "" && g.companyName !== "-");
    const m = String(g.jobMajorMatch || "");
    return isEmp && m.includes("ตรง") && !m.includes("ไม่ตรง");
  }).length;
  const studyCount = gradRecords.filter((g) => {
    const s = String(g.trackingStatus || "");
    return s.includes("ศึกษาต่อ") || s.includes("เรียนต่อ");
  }).length;
  const unemployedCount = gradRecords.filter((g) =>
    String(g.trackingStatus || "").includes("ว่างงาน")
  ).length;

  const employedPercent =
    totalGraduates > 0 ? ((employedCount / totalGraduates) * 100).toFixed(1) : "0.0";
  const studyPercent =
    totalGraduates > 0 ? ((studyCount / totalGraduates) * 100).toFixed(1) : "0.0";
  const unemployedPercent =
    totalGraduates > 0 ? ((unemployedCount / totalGraduates) * 100).toFixed(1) : "0.0";

  const hasActiveData =
    activeReport === "profile" ? profileRecords.length > 0 : gradRecords.length > 0;

  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!hasActiveData) return;

    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().slice(0, 10);

    if (activeReport === "profile") {
      const summaryRows = [
        { หมวดหมู่: "เงื่อนไขที่กรอง - ระดับชั้น", รายการ: level === "all" ? "ทุกระดับชั้น" : level, จำนวน: "", ร้อยละ: "" },
        { หมวดหมู่: "เงื่อนไขที่กรอง - สาขาวิชา", รายการ: major === "all" ? "ทุกสาขาวิชา" : major, จำนวน: "", ร้อยละ: "" },
        { หมวดหมู่: "1. สถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา", รายการ: "นักเรียนทั้งหมด", จำนวน: totalStudents, ร้อยละ: "100%" },
        { หมวดหมู่: "1. สถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา", รายการ: "ความสมบูรณ์ 100%", จำนวน: full100Count, ร้อยละ: `${full100Percent}%` },
        { หมวดหมู่: "1. สถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา", รายการ: "ความสมบูรณ์ต่ำกว่า 100%", จำนวน: below100Count, ร้อยละ: `${below100Percent}%` },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "สรุปภาพรวม");

      const profileRows = profileRecords.map((s, idx) => ({
        ลำดับ: idx + 1,
        รหัสนักศึกษา: s.studentId,
        คำนำหน้า: s.prefix || "",
        ชื่อ: s.firstName,
        นามสกุล: s.lastName,
        ระดับชั้น: s.educationLevel,
        สาขาวิชา: s.major || "-",
        "ความสมบูรณ์ (%)": `${s.completeness}%`,
        สถานะ: s.completeness >= 100 ? "ครบ 100%" : "ต่ำกว่า 100%",
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(profileRows),
        "รายชื่อปรับปรุงข้อมูล"
      );

      XLSX.writeFile(wb, `รายงานสถานะการปรับปรุงข้อมูล_${dateStr}.xlsx`);
    } else {
      const summaryRows = [
        { หมวดหมู่: "เงื่อนไขที่กรอง - ระดับชั้น", รายการ: level === "all" ? "ทุกระดับชั้น" : level, จำนวน: "", ร้อยละ: "" },
        { หมวดหมู่: "เงื่อนไขที่กรอง - สาขาวิชา", รายการ: major === "all" ? "ทุกสาขาวิชา" : major, จำนวน: "", ร้อยละ: "" },
        { หมวดหมู่: "2. ผลการติดตามผู้สำเร็จการศึกษา", รายการ: "ผู้สำเร็จการศึกษาทั้งหมด", จำนวน: totalGraduates, ร้อยละ: "100%" },
        { หมวดหมู่: "2. ผลการติดตามผู้สำเร็จการศึกษา", รายการ: "มีงานทำแล้ว", จำนวน: employedCount, ร้อยละ: `${employedPercent}%` },
        { หมวดหมู่: "2. ผลการติดตามผู้สำเร็จการศึกษา", รายการ: "ทำงานตรงสาขาวิชา", จำนวน: jobMatchedCount, ร้อยละ: "" },
        { หมวดหมู่: "2. ผลการติดตามผู้สำเร็จการศึกษา", รายการ: "ศึกษาต่อระดับสูงขึ้น", จำนวน: studyCount, ร้อยละ: `${studyPercent}%` },
        { หมวดหมู่: "2. ผลการติดตามผู้สำเร็จการศึกษา", รายการ: "การว่างงาน", จำนวน: unemployedCount, ร้อยละ: `${unemployedPercent}%` },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "สรุปภาพรวม");

      const gradRows = gradRecords.map((g, idx) => ({
        ลำดับ: idx + 1,
        ปีที่จบ: g.gradYear,
        รหัสนักศึกษา: g.studentId,
        "ชื่อ-นามสกุล": g.fullName,
        ระดับชั้น: g.educationLevel,
        สาขาวิชา: g.major || "-",
        สถานะปัจจุบัน: g.trackingStatus || "-",
        สถานประกอบการ: g.companyName || "-",
        ตำแหน่งงาน: g.jobPosition || "-",
        การตรงสาขาวิชา: g.jobMajorMatch || g.studyMajorMatch || "-",
        เงินเดือนเฉลี่ย: g.salaryRange || "-",
        สถานศึกษาต่อ: g.instituteName || "-",
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(gradRows),
        "รายชื่อติดตามผู้สำเร็จการศึกษา"
      );

      XLSX.writeFile(wb, `รายงานติดตามผู้สำเร็จการศึกษา_${dateStr}.xlsx`);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-500">
        กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Screen Top Bar (Hidden when printing) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าแดชบอร์ด
            </Link>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">
              ระบบออกรายงาน ({authUser?.name || authUser?.email})
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            ระบบค้นหาและพิมพ์รายงาน PDF / ส่งออก Excel
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ประมวลผลข้อมูลรวมจากทั้งไฟล์สถานะการปรับปรุงข้อมูลและไฟล์ติดตามผู้สำเร็จการศึกษาโดยอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {authUser?.role?.toUpperCase() === "ADMIN" && (
            <Link
              href="/admin/upload"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              หน้าจัดการอัปโหลดไฟล์
            </Link>
          )}
          <button
            onClick={handleExportExcel}
            disabled={!hasActiveData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            ส่งออก Excel (.xlsx)
          </button>
          <button
            onClick={handlePrintPDF}
            disabled={!hasActiveData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-md disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            พิมพ์รายงาน PDF
          </button>
        </div>
      </div>

      {/* Report Type Tabs + Print Scope Selector (Hidden when printing) */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
          <button
            type="button"
            onClick={() => setActiveReport("profile")}
            className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
              activeReport === "profile"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              1. สถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] ${
                activeReport === "profile"
                  ? "bg-white/20 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {totalStudents.toLocaleString()} คน
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReport("graduate")}
            className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
              activeReport === "graduate"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              2. ผลการติดตามผู้สำเร็จการศึกษา
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] ${
                activeReport === "graduate"
                  ? "bg-white/20 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {totalGraduates.toLocaleString()} คน
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 pl-1">
          <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
            รูปแบบพิมพ์ PDF:
          </span>
          <select
            value={printScope}
            onChange={(e) => setPrintScope(e.target.value as "full" | "summary")}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-700 font-semibold"
          >
            <option value="full">สรุป + ตารางรายชื่อ</option>
            <option value="summary">เฉพาะสรุปภาพรวม (1 หน้า)</option>
          </select>
        </div>
      </div>

      {/* Unified Filter Bar (Hidden when printing) */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Level Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-indigo-500" /> ระดับชั้น
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-700 font-medium"
            >
              <option value="all">ทุกระดับชั้น</option>
              <option value="ปวช">ปวช.</option>
              <option value="ปวส">ปวส.</option>
              <option value="ป.ตรี">ป.ตรี (ทล.บ.)</option>
            </select>
          </div>

          {/* Major Filter */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              สาขาวิชา
            </label>
            <select
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-700 font-medium"
            >
              <option value="all">ทุกสาขาวิชา ({availableMajors.length} สาขา)</option>
              {availableMajors.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Completeness Filter (Report 1 only) */}
          {activeReport === "profile" && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                ความสมบูรณ์โปรไฟล์
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-700 font-medium"
              >
                <option value="all">ทั้งหมด</option>
                <option value="full100">ความสมบูรณ์ 100%</option>
                <option value="below100">ต่ำกว่า 100%</option>
              </select>
            </div>
          )}

          {/* Employment Status Filter (Report 2 only) */}
          {activeReport === "graduate" && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                สถานะผู้สำเร็จการศึกษา
              </label>
              <select
                value={gradStatus}
                onChange={(e) => setGradStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-700 font-medium"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="มีงานทำ">มีงานทำ</option>
                <option value="ศึกษาต่อ">ศึกษาต่อ</option>
                <option value="ว่างงาน">ว่างงาน</option>
              </select>
            </div>
          )}

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              ค้นหารหัส / ชื่อ-สกุล
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="พิมพ์ค้นหา..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:border-none print:shadow-none print:p-0 space-y-6">
        {/* Formal Report Header */}
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="ตราวิทยาลัยเทคนิคเชียงใหม่"
              className="w-12 h-12 object-contain"
            />
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {activeReport === "profile"
                  ? "รายงานสถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา"
                  : "รายงานผลการติดตามผู้สำเร็จการศึกษา"}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                วิทยาลัยเทคนิคเชียงใหม่ • ระบบสารสนเทศศูนย์ข้อมูลวิจัยและประเมินผล (V-COP)
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-1">
                <span>
                  <strong>ระดับชั้น:</strong> {level === "all" ? "ทุกระดับชั้น" : level}
                </span>
                <span>
                  <strong>สาขาวิชา:</strong> {major === "all" ? "ทุกสาขาวิชา" : major}
                </span>
                {activeReport === "profile" && tier !== "all" && (
                  <span>
                    <strong>ความสมบูรณ์:</strong> {tier === "full100" ? "ครบ 100%" : "ต่ำกว่า 100%"}
                  </span>
                )}
                {activeReport === "graduate" && gradStatus !== "all" && (
                  <span>
                    <strong>สถานะผู้สำเร็จการศึกษา:</strong> {gradStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
            {activeReport === "profile" ? (
              <div>
                จำนวนนักเรียนทั้งหมด:{" "}
                <strong className="text-emerald-600 font-extrabold">
                  {totalStudents.toLocaleString()}
                </strong>{" "}
                คน
              </div>
            ) : (
              <div>
                ผู้สำเร็จการศึกษาทั้งหมด:{" "}
                <strong className="text-indigo-600 font-extrabold">
                  {totalGraduates.toLocaleString()}
                </strong>{" "}
                คน
              </div>
            )}
            <div className="text-[11px] text-slate-400">
              พิมพ์เมื่อ:{" "}
              {new Date().toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        {/* Summary Box for Active Report */}
        {activeReport === "profile" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-extrabold text-slate-800">
                1. สรุปสถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                <div className="text-[11px] text-slate-500">ทั้งหมด</div>
                <div className="text-base font-extrabold text-slate-900">
                  {totalStudents.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">คน</div>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                <div className="text-[11px] text-emerald-700 font-semibold">ครบ 100%</div>
                <div className="text-base font-extrabold text-emerald-600">
                  {full100Count.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">{full100Percent}%</div>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-emerald-100">
                <div className="text-[11px] text-amber-700 font-semibold">ต่ำกว่า 100%</div>
                <div className="text-base font-extrabold text-amber-600">
                  {below100Count.toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-600 font-medium">{below100Percent}%</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-slate-800">
                2. สรุปผลการติดตามผู้สำเร็จการศึกษา
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white rounded-lg p-2.5 border border-indigo-100">
                <div className="text-[11px] text-slate-500">ทั้งหมด</div>
                <div className="text-base font-extrabold text-slate-900">
                  {totalGraduates.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">คน</div>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-indigo-100">
                <div className="text-[11px] text-emerald-700 font-semibold">มีงานทำแล้ว</div>
                <div className="text-base font-extrabold text-emerald-600">
                  {employedCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">
                  {employedPercent}% (ตรงสาย {jobMatchedCount})
                </div>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-indigo-100">
                <div className="text-[11px] text-blue-700 font-semibold">ศึกษาต่อ</div>
                <div className="text-base font-extrabold text-blue-600">
                  {studyCount.toLocaleString()}
                </div>
                <div className="text-[10px] text-blue-600 font-medium">{studyPercent}%</div>
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-indigo-100">
                <div className="text-[11px] text-rose-700 font-semibold">การว่างงาน</div>
                <div className="text-base font-extrabold text-rose-600">
                  {unemployedPercent}%
                </div>
                <div className="text-[10px] text-rose-600 font-medium">
                  {unemployedCount.toLocaleString()} คน
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            กำลังประมวลผลข้อมูลจากทั้ง 2 ไฟล์...
          </div>
        ) : (
          <div className={printScope === "summary" ? "no-print space-y-4" : "space-y-4"}>
            {printScope === "summary" && (
              <div className="no-print px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
                โหมดพิมพ์เฉพาะสรุปภาพรวม (1 หน้า) — ตารางรายชื่อด้านล่างจะไม่ถูกพิมพ์ลงใน PDF
              </div>
            )}
            {activeReport === "profile" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  ส่วนที่ 1: รายชื่อและสถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา ({profileRecords.length.toLocaleString()} คน)
                </h3>
              </div>

              {profileRecords.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  ไม่พบข้อมูลสถานะการปรับปรุงข้อมูลตามเงื่อนไขที่เลือก (กรุณาอัปโหลดไฟล์หมวดที่ 1: รายงานสถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา)
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-200 text-slate-700 font-bold text-[11px]">
                        <th className="py-2 px-3 text-center w-12">ลำดับ</th>
                        <th className="py-2 px-3">รหัสนักศึกษา</th>
                        <th className="py-2 px-3">ชื่อ-นามสกุล</th>
                        <th className="py-2 px-3">ระดับชั้น</th>
                        <th className="py-2 px-3">สาขาวิชา</th>
                        <th className="py-2 px-3 text-center">ความสมบูรณ์</th>
                        <th className="py-2 px-3 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {profileRecords.map((s, index) => (
                        <tr key={s.id} className="hover:bg-slate-50/70">
                          <td className="py-1.5 px-3 text-center text-slate-500">{index + 1}</td>
                          <td className="py-1.5 px-3 font-mono font-medium text-slate-900">
                            {s.studentId}
                          </td>
                          <td className="py-1.5 px-3 font-medium text-slate-900">
                            {s.prefix}
                            {s.firstName} {s.lastName}
                          </td>
                          <td className="py-1.5 px-3">{s.educationLevel}</td>
                          <td className="py-1.5 px-3">{s.major || "-"}</td>
                          <td className="py-1.5 px-3 text-center font-bold">{s.completeness}%</td>
                          <td className="py-1.5 px-3 text-center">
                            {s.completeness >= 100 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 no-print" />
                                ครบ 100%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                                <AlertCircle className="w-3 h-3 text-amber-600 no-print" />
                                ต่ำกว่า 100%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  ส่วนที่ 2: รายชื่อและผลการติดตามผู้สำเร็จการศึกษา ({gradRecords.length.toLocaleString()} คน)
                </h3>
              </div>

              {gradRecords.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  ไม่พบข้อมูลผู้สำเร็จการศึกษาตามเงื่อนไขที่เลือก
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-200 text-slate-700 font-bold text-[11px]">
                        <th className="py-2 px-3 text-center w-12">ลำดับ</th>
                        <th className="py-2 px-3">รหัสนักศึกษา</th>
                        <th className="py-2 px-3">ชื่อ-นามสกุล</th>
                        <th className="py-2 px-3">ระดับชั้น</th>
                        <th className="py-2 px-3">สาขาวิชา</th>
                        <th className="py-2 px-3">สถานะ</th>
                        <th className="py-2 px-3">สถานประกอบการ / สถานศึกษาต่อ</th>
                        <th className="py-2 px-3 text-center">ตรงสาขา</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {gradRecords.map((g, index) => (
                        <tr key={g.id} className="hover:bg-slate-50/70">
                          <td className="py-1.5 px-3 text-center text-slate-500">{index + 1}</td>
                          <td className="py-1.5 px-3 font-mono font-medium text-slate-900">
                            {g.studentId}
                          </td>
                          <td className="py-1.5 px-3 font-medium text-slate-900">{g.fullName}</td>
                          <td className="py-1.5 px-3">{g.educationLevel}</td>
                          <td className="py-1.5 px-3">{g.major || "-"}</td>
                          <td className="py-1.5 px-3 font-semibold">{g.trackingStatus}</td>
                          <td className="py-1.5 px-3">
                            {g.companyName || g.instituteName || "-"}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            {g.jobMajorMatch || g.studyMajorMatch || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
