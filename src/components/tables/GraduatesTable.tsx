"use client";

import { Search, ChevronLeft, ChevronRight, Briefcase, GraduationCap, Building2, CheckCircle2, XCircle } from "lucide-react";

interface Graduate {
  id: string;
  studentId: string;
  fullName: string;
  educationLevel: string;
  faculty?: string;
  major?: string;
  gradYear: number;
  trackingStatus?: string;
  furtherStudyLevel?: string;
  instituteName?: string;
  studyMajorMatch?: string;
  companyName?: string;
  jobPosition?: string;
  salaryRange?: string;
  jobMajorMatch?: string;
}

interface GraduatesTableProps {
  graduates: Graduate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedMatch: string;
  onMatchChange: (match: string) => void;
  loading?: boolean;
}

export default function GraduatesTable({
  graduates = [],
  pagination,
  searchTerm,
  onSearchChange,
  onPageChange,
  selectedStatus,
  onStatusChange,
  selectedMatch,
  onMatchChange,
  loading = false,
}: GraduatesTableProps) {
  const getStatusBadge = (status?: string) => {
    if (!status) return <span className="text-slate-400">-</span>;
    if (status.includes("มีงานทำ") || status.includes("ทำงาน")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Briefcase className="w-3 h-3 text-emerald-500" />
          มีงานทำ
        </span>
      );
    }
    if (status.includes("ศึกษาต่อ") || status.includes("เรียนต่อ")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <GraduationCap className="w-3 h-3 text-blue-500" />
          ศึกษาต่อ
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        {status}
      </span>
    );
  };

  const getMatchBadge = (match?: string) => {
    if (!match || match === "-") return <span className="text-slate-300">-</span>;
    if (match.includes("ตรง") && !match.includes("ไม่ตรง")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          ตรงสาย
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700">
        <XCircle className="w-3 h-3 text-amber-600" />
        ไม่ตรงสาย
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัส, สถานประกอบการ หรือตำแหน่ง..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">ทุกสถานะการติดตาม</option>
            <option value="มีงานทำ">มีงานทำ</option>
            <option value="ศึกษาต่อ">ศึกษาต่อ</option>
            <option value="ว่างงาน">ว่างงาน</option>
          </select>

          <select
            value={selectedMatch}
            onChange={(e) => onMatchChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">การทำงานตรงสาย (ทั้งหมด)</option>
            <option value="ตรง">ตรงสาย</option>
            <option value="ไม่ตรง">ไม่ตรงสาย</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">รหัสนักศึกษา</th>
              <th className="px-4 py-3.5">ชื่อ - นามสกุล</th>
              <th className="px-4 py-3.5">ระดับ / สาขาวิชา</th>
              <th className="px-4 py-3.5">ปีที่จบ</th>
              <th className="px-4 py-3.5">สถานะ</th>
              <th className="px-4 py-3.5">สถานที่ทำงาน / ศึกษาต่อ</th>
              <th className="px-4 py-3.5">ตำแหน่งงาน / เงินเดือน</th>
              <th className="px-4 py-3.5 text-center">ตรงสาย</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : graduates.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  ไม่พบข้อมูลผู้สำเร็จการศึกษาตามเงื่อนไข
                </td>
              </tr>
            ) : (
              graduates.map((grad) => (
                <tr key={grad.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 font-mono font-medium text-indigo-600">
                    {grad.studentId}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{grad.fullName}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{grad.educationLevel}</span>
                    <div className="text-[11px] text-slate-400">{grad.major || "-"}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{grad.gradYear}</td>
                  <td className="px-4 py-3">{getStatusBadge(grad.trackingStatus)}</td>
                  <td className="px-4 py-3">
                    {grad.companyName ? (
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{grad.companyName}</span>
                      </div>
                    ) : grad.instituteName ? (
                      <div className="flex items-center gap-1.5 font-medium text-blue-800">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{grad.instituteName}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{grad.jobPosition || grad.furtherStudyLevel || "-"}</div>
                    {grad.salaryRange && (
                      <div className="text-[11px] font-semibold text-emerald-600">
                        ฿ {grad.salaryRange}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getMatchBadge(grad.jobMajorMatch || grad.studyMajorMatch)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          แสดง {(pagination.page - 1) * pagination.limit + 1} -{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} จากทั้งหมด{" "}
          <span className="font-semibold text-slate-800">{pagination.total.toLocaleString()}</span> รายการ
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-700 font-medium">
            หน้า {pagination.page} / {pagination.totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
