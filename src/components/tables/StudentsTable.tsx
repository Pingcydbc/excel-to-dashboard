"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Student {
  id: string;
  studentId: string;
  prefix?: string;
  firstName: string;
  lastName: string;
  educationLevel: string;
  faculty?: string;
  major?: string;
  minor?: string;
  lastProfileUpdate?: string | null;
  completeness: number;
}

interface StudentsTableProps {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  selectedTier: string;
  onTierChange: (tier: string) => void;
  loading?: boolean;
}

export default function StudentsTable({
  students = [],
  pagination,
  searchTerm,
  onSearchChange,
  onPageChange,
  selectedTier,
  onTierChange,
  loading = false,
}: StudentsTableProps) {
  const getCompletenessBadge = (percent: number) => {
    if (percent >= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          สมบูรณ์ ({percent}%)
        </span>
      );
    }
    if (percent >= 50) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          ปานกลาง ({percent}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3 h-3 text-rose-500" />
        ไม่สมบูรณ์ ({percent}%)
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหารหัสนักศึกษา, ชื่อ-สกุล หรือสาขาวิชา..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Tier Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedTier}
            onChange={(e) => onTierChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none cursor-pointer"
          >
            <option value="">ทุกระดับความสมบูรณ์</option>
            <option value="completed">สมบูรณ์ (≥ 80%)</option>
            <option value="medium">ปานกลาง (50 - 79%)</option>
            <option value="low">ไม่สมบูรณ์ (&lt; 50%)</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">รหัสนักศึกษา</th>
              <th className="px-4 py-3.5">ชื่อ - นามสกุล</th>
              <th className="px-4 py-3.5">ระดับชั้น</th>
              <th className="px-4 py-3.5">สาขาวิชา / สาขางาน</th>
              <th className="px-4 py-3.5">วันที่อัปเดตโปรไฟล์</th>
              <th className="px-4 py-3.5 min-w-[140px]">ความสมบูรณ์ (%)</th>
              <th className="px-4 py-3.5 text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  ไม่พบข้อมูลนักศึกษาตามเงื่อนไขที่ค้นหา
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 font-mono font-medium text-indigo-600">
                    {student.studentId}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {student.prefix ? `${student.prefix} ` : ""}
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                      {student.educationLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{student.major || "-"}</div>
                    {student.minor && (
                      <div className="text-[11px] text-slate-400">{student.minor}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {student.lastProfileUpdate ? formatDate(student.lastProfileUpdate) : "ยังไม่อัปเดต"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          student.completeness >= 80
                            ? "bg-emerald-500"
                            : student.completeness >= 50
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${student.completeness}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 mt-1 inline-block">
                      {student.completeness}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getCompletenessBadge(student.completeness)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
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
