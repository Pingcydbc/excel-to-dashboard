"use client";

import { useState, useEffect } from "react";
import { UserCheck, CheckCircle2, AlertTriangle, XCircle, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import StatCard from "@/components/StatCard";
import StudentsTable from "@/components/tables/StudentsTable";
import CompletenessRadialChart from "@/components/charts/CompletenessRadialChart";

export default function ProfileStatusPage() {
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedMajor, setSelectedMajor] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const [stats, setStats] = useState<any>(null);

  // Fetch Stats for Top Cards & Chart
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

  // Fetch Paginated Table Data
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");
      if (searchTerm) params.set("search", searchTerm);
      if (selectedLevel !== "all") params.set("level", selectedLevel);
      if (selectedMajor !== "all") params.set("major", selectedMajor);
      if (selectedTier) params.set("tier", selectedTier);

      const res = await fetch(`/api/profile-status?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setStudentsData(json.data || []);
        setPagination(json.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedLevel, selectedMajor]);

  useEffect(() => {
    fetchStudents();
  }, [page, searchTerm, selectedLevel, selectedMajor, selectedTier]);

  const handleResetFilters = () => {
    setSelectedLevel("all");
    setSelectedMajor("all");
    setSelectedTier("");
    setSearchTerm("");
    setPage(1);
  };

  const profileStats = stats?.profileStats || {};
  const filterMeta = stats?.filters || { majors: [] };

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
            ตรวจสอบเปอร์เซ็นต์ความสมบูรณ์ของโปรไฟล์ (Completeness %) และติดตามกลุ่มที่ยังไม่อัปเดต
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        selectedYear="all"
        onYearChange={() => {}}
        selectedLevel={selectedLevel}
        onLevelChange={(lvl) => {
          setSelectedLevel(lvl);
          setPage(1);
        }}
        selectedMajor={selectedMajor}
        onMajorChange={(m) => {
          setSelectedMajor(m);
          setPage(1);
        }}
        majors={filterMeta.majors}
        years={[]}
        showYearFilter={false}
        onReset={handleResetFilters}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="นักศึกษาทั้งหมด"
          value={`${profileStats.totalStudents?.toLocaleString() || 0} คน`}
          subtitle="ในฐานข้อมูลตามตัวกรอง"
          icon={UserCheck}
          color="indigo"
        />

        <StatCard
          title="โปรไฟล์สมบูรณ์ดี (≥ 80%)"
          value={`${profileStats.completedStudents?.toLocaleString() || 0} คน`}
          subtitle={`คิดเป็น ${profileStats.completenessRate?.toFixed(1) || 0}% ของทั้งหมด`}
          icon={CheckCircle2}
          color="emerald"
        />

        <StatCard
          title="ความสมบูรณ์ปานกลาง (50-79%)"
          value={`${profileStats.mediumStudents?.toLocaleString() || 0} คน`}
          subtitle="ข้อมูลยังไม่ครบถ้วนบางส่วน"
          icon={AlertTriangle}
          color="amber"
        />

        <StatCard
          title="ยังไม่อัปเดต (< 50%)"
          value={`${profileStats.lowStudents?.toLocaleString() || 0} คน`}
          subtitle="ต้องเร่งรัดการปรับปรุงข้อมูล"
          icon={XCircle}
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
              ครูที่ปรึกษาและงานทะเบียนสามารถค้นหารหัสนักศึกษา หรือกรองตามระดับชั้น/สาขาวิชาเพื่อประสานงานให้นักศึกษาดำเนินการอัปเดตข้อมูลส่วนตัวในระบบให้ครบถ้วน 100%
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 mt-4">
            <div className="text-xs font-bold text-emerald-800">เป้าหมายความสมบูรณ์สถานศึกษา</div>
            <p className="text-xs text-emerald-700 mt-1">
              ต้องการให้อัตราความสมบูรณ์รวมเฉลี่ยไม่น้อยกว่า 85% เพื่อความพร้อมในการประเมินคุณภาพ
            </p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">รายชื่อนักศึกษาและสถานะความสมบูรณ์</h2>
        </div>
        <StudentsTable
          students={studentsData}
          pagination={pagination}
          searchTerm={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setPage(1);
          }}
          onPageChange={setPage}
          selectedTier={selectedTier}
          onTierChange={(tier) => {
            setSelectedTier(tier);
            setPage(1);
          }}
          loading={loading}
        />
      </div>
    </div>
  );
}
