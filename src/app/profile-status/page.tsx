"use client";

import { useState, useEffect } from "react";
import { UserCheck, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import StatCard from "@/components/StatCard";
import CompletenessRadialChart from "@/components/charts/CompletenessRadialChart";

export default function ProfileStatusPage() {
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedMajor, setSelectedMajor] = useState<string>("all");
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
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
  }, [selectedLevel, selectedMajor]);

  const handleResetFilters = () => {
    setSelectedLevel("all");
    setSelectedMajor("all");
  };

  const profileStats = stats?.profileStats || {};
  const filterMeta = stats?.filters || { profileMajors: [] };

  return (
    <div className="space-y-6" id="profile-status-content">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าหลัก
            </Link>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">เสาหลักที่ 1</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            สถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ตรวจสอบเปอร์เซ็นต์ความสมบูรณ์ของโปรไฟล์ (Completeness %) และภาพรวมการอัปเดตข้อมูล
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        selectedYear="all"
        onYearChange={() => {}}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        selectedMajor={selectedMajor}
        onMajorChange={setSelectedMajor}
        majors={filterMeta.profileMajors || []}
        years={[]}
        showYearFilter={false}
        onReset={handleResetFilters}
      />

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="1. นักศึกษาทั้งหมด"
          value={`${profileStats.totalStudents?.toLocaleString() || 0} คน`}
          subtitle="ในฐานข้อมูลตามตัวกรอง"
          icon={UserCheck}
          color="indigo"
        />

        <StatCard
          title="2. ความสมบูรณ์ 100%"
          value={`${profileStats.full100Students?.toLocaleString() || 0} คน`}
          subtitle={`คิดเป็น ${profileStats.full100Rate?.toFixed(1) || 0}% ของทั้งหมด`}
          icon={CheckCircle2}
          color="emerald"
        />

        <StatCard
          title="3. ต่ำกว่า 100%"
          value={`${profileStats.below100Students?.toLocaleString() || 0} คน`}
          subtitle={`คิดเป็น ${profileStats.below100Rate?.toFixed(1) || 0}% ของทั้งหมด`}
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CompletenessRadialChart
            distribution={profileStats.distribution || []}
            avgCompleteness={profileStats.avgCompleteness || 0}
          />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">แนวทางการติดตาม</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ครูที่ปรึกษาและงานทะเบียนสามารถกรองตามระดับชั้นและสาขาวิชาเพื่อติดตามภาพรวมความครบถ้วนของข้อมูลนักศึกษา และสามารถเข้าสู่ระบบสำหรับพิมพ์รายงานเพื่อออกเอกสาร PDF รายสาขาได้
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 mt-4">
            <div className="text-xs font-bold text-emerald-800">เป้าหมายความสมบูรณ์สถานศึกษา</div>
            <p className="text-xs text-emerald-700 mt-1">
              ส่งเสริมให้นักศึกษาดำเนินการปรับปรุงข้อมูลส่วนตัวในระบบให้ครบถ้วนสมบูรณ์ 100%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
