"use client";

import { Filter, RotateCcw, Calendar, GraduationCap, BookOpen } from "lucide-react";

interface FilterBarProps {
  selectedYear: string;
  onYearChange: (year: string) => void;
  selectedLevel: string;
  onLevelChange: (level: string) => void;
  selectedMajor: string;
  onMajorChange: (major: string) => void;
  years: number[];
  majors: string[];
  onReset: () => void;
  showYearFilter?: boolean;
}

export default function FilterBar({
  selectedYear,
  onYearChange,
  selectedLevel,
  onLevelChange,
  selectedMajor,
  onMajorChange,
  years = [],
  majors = [],
  onReset,
  showYearFilter = true,
}: FilterBarProps) {
  const isFiltered = selectedYear !== "all" || selectedLevel !== "all" || selectedMajor !== "all";

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>ตัวกรองข้อมูล (Filters)</span>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Filter */}
          {showYearFilter && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="year-select" className="text-slate-500 font-medium">ปีการศึกษา:</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => onYearChange(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">ทุกปีการศึกษา</option>
                {years.map((y) => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Education Level Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="level-select" className="text-slate-500 font-medium">ระดับชั้น:</label>
            <select
              id="level-select"
              value={selectedLevel}
              onChange={(e) => onLevelChange(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">ทุกระดับชั้น</option>
              <option value="ปวช">ปวช.</option>
              <option value="ปวส">ปวส.</option>
            </select>
          </div>

          {/* Major Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="major-select" className="text-slate-500 font-medium">สาขาวิชา:</label>
            <select
              id="major-select"
              value={selectedMajor}
              onChange={(e) => onMajorChange(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="all">ทุกสาขาวิชา</option>
              {majors.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          {isFiltered && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl transition font-medium"
              title="ล้างตัวกรอง"
            >
              <RotateCcw className="w-3 h-3" />
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
