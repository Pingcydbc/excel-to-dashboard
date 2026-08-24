"use client";

import { useState, useEffect } from "react";
import {
  UserCheck,
  Briefcase,
  Building2,
  TrendingUp,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import FilterBar from "@/components/FilterBar";
import CompletenessRadialChart from "@/components/charts/CompletenessRadialChart";
import EmploymentStatusPieChart from "@/components/charts/EmploymentStatusPieChart";
import MajorJobMatchBarChart from "@/components/charts/MajorJobMatchBarChart";
import TopCompaniesBarChart from "@/components/charts/TopCompaniesBarChart";
import SalaryRangeBarChart from "@/components/charts/SalaryRangeBarChart";

export default function OverviewDashboardPage() {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedMajor, setSelectedMajor] = useState<string>("all");

  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
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
      console.error("Failed to fetch dashboard stats", e);
    } finally {
      setLoading(false);
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

  const profileStats = stats?.profileStats || {};
  const employmentStats = stats?.employmentStats || {};
  const companyStats = stats?.companyStats || {};
  const filterMeta = stats?.filters || { years: [], majors: [] };

  return (
    <div className="space-y-6" id="dashboard-content">
      {/* Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              V-COP CMTC Dashboard
            </span>
            <span className="text-xs text-slate-400">วิทยาลัยเทคนิคเชียงใหม่</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            ภาพรวมรายงานสถานะนักศึกษาและภาวะการมีงานทำ
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ระบบติดตาม 3 เสาหลัก: สถานะการปรับปรุงข้อมูล (ศธ.02) • ภาวะการมีงานทำ • สถิติสถานประกอบการ
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
        majors={filterMeta.majors}
        onReset={handleResetFilters}
      />

      {/* 3 Core Pillars KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1 KPI */}
        <StatCard
          title="1. อัปเดตโปรไฟล์สมบูรณ์"
          value={`${profileStats.completenessRate?.toFixed(1) || 0}%`}
          subtitle={`สมบูรณ์ ${profileStats.completedStudents?.toLocaleString() || 0} จาก ${profileStats.totalStudents?.toLocaleString() || 0} คน`}
          icon={UserCheck}
          color="emerald"
          trend="Completeness"
        />

        {/* Pillar 2 KPI 1 */}
        <StatCard
          title="2. อัตราการได้งานทำ"
          value={`${employmentStats.employmentRate || 0}%`}
          subtitle={`มีงานทำ ${employmentStats.employedCount?.toLocaleString() || 0} จาก ${employmentStats.totalGraduates?.toLocaleString() || 0} คน`}
          icon={Briefcase}
          color="indigo"
          trend="Employment Rate"
        />

        {/* Pillar 2 KPI 2 */}
        <StatCard
          title="2. สัดส่วนทำงานตรงสาย"
          value={`${employmentStats.matchRate || 0}%`}
          subtitle={`ตรงสาย ${employmentStats.jobMatchedCount?.toLocaleString() || 0} คน`}
          icon={TrendingUp}
          color="blue"
          trend="Job Matching"
        />

        {/* Pillar 3 KPI */}
        <StatCard
          title="3. จำนวนสถานประกอบการ"
          value={`${companyStats.totalUniqueCompanies?.toLocaleString() || 0} แห่ง`}
          subtitle="สถานประกอบการที่รับเข้าทำงาน"
          icon={Building2}
          color="purple"
          trend="Hiring Partners"
        />
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: สถานะการปรับปรุงข้อมูล (Student Profile Status) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                เสาหลักที่ 1: สถานะการปรับปรุงข้อมูลนักศึกษา (Profile Completeness)
              </h2>
              <p className="text-xs text-slate-400">
                ติดตามความครบถ้วนสมบูรณ์ของโปรไฟล์นักศึกษาในระบบ ศธ.02
              </p>
            </div>
          </div>
          <Link
            href="/profile-status"
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 no-print"
          >
            ดูรายละเอียดทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CompletenessRadialChart
              distribution={profileStats.distribution || []}
              avgCompleteness={profileStats.avgCompleteness || 0}
            />
          </div>

          <div className="flex flex-col justify-between space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">สรุปความพร้อมข้อมูล</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                นักศึกษาที่มีข้อมูลสมบูรณ์ตั้งแต่ 80% ขึ้นไป ถือว่าพร้อมสำหรับการออกรายงานและติดตามผล
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-slate-200/70">
                <span className="text-slate-600 font-medium">สมบูรณ์ดี (≥ 80%)</span>
                <span className="font-bold text-emerald-600">
                  {profileStats.completedStudents?.toLocaleString() || 0} คน
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-slate-200/70">
                <span className="text-slate-600 font-medium">ปานกลาง (50-79%)</span>
                <span className="font-bold text-amber-600">
                  {profileStats.mediumStudents?.toLocaleString() || 0} คน
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-slate-200/70">
                <span className="text-slate-600 font-medium">ต้องปรับปรุง (&lt; 50%)</span>
                <span className="font-bold text-rose-600">
                  {profileStats.lowStudents?.toLocaleString() || 0} คน
                </span>
              </div>
            </div>

            <Link
              href="/profile-status"
              className="w-full text-center py-2.5 rounded-xl bg-white border border-indigo-200 text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition no-print shadow-sm"
            >
              ค้นหารายชื่อนักศึกษาที่ต้องปรับปรุงข้อมูล →
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: สถานะการมีงานทำ (Graduate Tracking & Employment) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                เสาหลักที่ 2: สถานะการมีงานทำ & ศึกษาต่อ (Graduate Employment Status)
              </h2>
              <p className="text-xs text-slate-400">
                ผลการติดตามผู้สำเร็จการศึกษา ภาวะการทำงานตรงสาย และการกระจายรายได้
              </p>
            </div>
          </div>
          <Link
            href="/employment"
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 no-print"
          >
            ดูรายละเอียดทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <SalaryRangeBarChart data={employmentStats.salaryChartData || []} />
          
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Insight & Key Takeaway
              </div>
              <h3 className="text-lg font-bold mt-2">ภาพรวมศักยภาพการมีงานทำ</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                ผู้สำเร็จการศึกษาส่วนใหญ่มีอัตราการได้งานทำและศึกษาต่อรวมกว่า{" "}
                <span className="text-emerald-400 font-bold">
                  {((employmentStats.employmentRate || 0) + (employmentStats.studyRate || 0)).toFixed(1)}%
                </span>{" "}
                โดยมีสัดส่วนการทำงานตรงตามสาขาวิชาที่สำเร็จการศึกษาถึง{" "}
                <span className="text-indigo-300 font-bold">{employmentStats.matchRate || 0}%</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-800">
              <div>
                <span className="text-slate-400 text-xs">อัตราศึกษาต่อ</span>
                <p className="text-xl font-extrabold text-blue-400">{employmentStats.studyRate || 0}%</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">ทำงานตรงสาย</span>
                <p className="text-xl font-extrabold text-emerald-400">{employmentStats.matchRate || 0}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: จำนวนสถานประกอบการ (Company & Employer Analytics) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                เสาหลักที่ 3: สถิติและเครือข่ายสถานประกอบการ (Company Analytics)
              </h2>
              <p className="text-xs text-slate-400">
                จำนวนสถานประกอบการทั้งหมด และ 10 อันดับสถานประกอบการชั้นนำที่รับนักศึกษาเข้าทำงาน
              </p>
            </div>
          </div>
          <Link
            href="/companies"
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 no-print"
          >
            ดูรายชื่อสถานประกอบการทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TopCompaniesBarChart data={companyStats.topCompanies || []} />
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">สรุปเครือข่ายความร่วมมือ</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                มีสถานประกอบการร่วมรับนักศึกษาเข้าทำงานทั้งหมด{" "}
                <span className="font-bold text-slate-800">
                  {companyStats.totalUniqueCompanies?.toLocaleString() || 0} แห่ง
                </span>{" "}
                ครอบคลุมหลากหลายกลุ่มอุตสาหกรรม
              </p>

              <div className="space-y-2">
                {(companyStats.topCompanies || []).slice(0, 4).map((c: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="font-medium text-slate-800 truncate max-w-[160px]">{c.companyName}</span>
                    <span className="font-bold text-indigo-600">{c.count} คน</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/companies"
              className="w-full text-center py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm no-print mt-4"
            >
              ดูสถิติสถานประกอบการฉบับเต็ม →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
