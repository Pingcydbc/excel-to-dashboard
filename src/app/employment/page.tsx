"use client";

import { useState, useEffect } from "react";
import { Briefcase, GraduationCap, TrendingUp, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import StatCard from "@/components/StatCard";
import EmploymentStatusPieChart from "@/components/charts/EmploymentStatusPieChart";
import MajorJobMatchBarChart from "@/components/charts/MajorJobMatchBarChart";
import SalaryRangeBarChart from "@/components/charts/SalaryRangeBarChart";

export default function EmploymentPage() {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedMajor, setSelectedMajor] = useState<string>("all");
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedYear !== "all") params.set("year", selectedYear);
      if (selectedLevel !== "all") params.set("level", selectedLevel);
      if (selectedMajor !== "all") params.set("major", selectedMajor);

      const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedYear, selectedLevel, selectedMajor]);

  const handleResetFilters = () => {
    setSelectedYear("all");
    setSelectedLevel("all");
    setSelectedMajor("all");
  };

  const employmentStats = stats?.employmentStats || {};
  const filterMeta = stats?.filters || { years: [], gradMajors: [] };

  return (
    <div className="space-y-6" id="employment-content">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าหลัก
            </Link>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">เสาหลักที่ 2</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            สถานะการมีงานทำของผู้สำเร็จการศึกษา
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ติดตามภาวะการมีงานทำ, การศึกษาต่อ, การทำงานตรงสาขาวิชา และฐานเงินเดือน
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        selectedMajor={selectedMajor}
        onMajorChange={setSelectedMajor}
        years={filterMeta.years}
        majors={filterMeta.gradMajors || []}
        onReset={handleResetFilters}
      />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="1. ผู้สำเร็จการศึกษาทั้งหมด"
          value={`${employmentStats.totalGraduates?.toLocaleString() || 0} คน`}
          subtitle="ตามเงื่อนไขตัวกรอง"
          icon={GraduationCap}
          color="indigo"
        />

        <StatCard
          title="2. มีงานทำแล้ว"
          value={`${employmentStats.employmentRate || 0}%`}
          subtitle={`จำนวน ${employmentStats.employedCount?.toLocaleString() || 0} คน`}
          icon={Briefcase}
          color="emerald"
          topContent={
            <div className="inline-flex flex-wrap items-center gap-1.5 text-[11px] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200/80">
              <span className="flex items-center gap-1 font-semibold text-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                ทำงานตรงสาขาวิชา:
              </span>
              <span className="font-bold text-emerald-700">
                {employmentStats.matchRate || 0}% ({employmentStats.jobMatchedCount?.toLocaleString() || 0} คน)
              </span>
            </div>
          }
        />

        <StatCard
          title="3. ศึกษาต่อระดับสูงขึ้น"
          value={`${employmentStats.studyRate || 0}%`}
          subtitle={`จำนวน ${employmentStats.studyCount?.toLocaleString() || 0} คน`}
          icon={TrendingUp}
          color="blue"
        />

        <StatCard
          title="4. การว่างงาน"
          value={`${employmentStats.unemploymentRate || 0}%`}
          subtitle={`จำนวน ${employmentStats.unemployedCount?.toLocaleString() || 0} คน`}
          icon={AlertCircle}
          color="rose"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <EmploymentStatusPieChart
            data={employmentStats.statusChartData || []}
            total={employmentStats.totalGraduates || 0}
          />
        </div>

        <div className="lg:col-span-2">
          <MajorJobMatchBarChart data={employmentStats.majorMatchChartData || []} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalaryRangeBarChart data={employmentStats.salaryChartData || []} />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">สรุปภาพรวมการมีงานทำ</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              อัตราการมีงานทำและการศึกษาต่อรวมเป็นดัชนีชี้วัดสำคัญตามเกณฑ์มาตรฐานอาชีวศึกษา โดยการทำงานตรงสายแสดงถึงความสอดคล้องระหว่างหลักสูตรการเรียนและความต้องการของตลาดแรงงาน
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600">อัตราตรงสายเฉลี่ย</span>
              <span className="font-bold text-emerald-600">{employmentStats.matchRate || 0}%</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600">อัตราการว่างงาน</span>
              <span className="font-bold text-rose-600">{employmentStats.unemploymentRate || 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
