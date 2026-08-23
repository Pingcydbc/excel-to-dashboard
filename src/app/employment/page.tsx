"use client";

import { useState, useEffect } from "react";
import { Briefcase, GraduationCap, TrendingUp, DollarSign, ArrowLeft } from "lucide-react";
import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import StatCard from "@/components/StatCard";
import GraduatesTable from "@/components/tables/GraduatesTable";
import EmploymentStatusPieChart from "@/components/charts/EmploymentStatusPieChart";
import MajorJobMatchBarChart from "@/components/charts/MajorJobMatchBarChart";
import SalaryRangeBarChart from "@/components/charts/SalaryRangeBarChart";

export default function EmploymentPage() {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedMajor, setSelectedMajor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("all");
  const [page, setPage] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [graduatesData, setGraduatesData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

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

  const fetchGraduates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");
      if (searchTerm && searchTerm !== "all") params.set("search", searchTerm);
      if (selectedYear !== "all") params.set("year", selectedYear);
      if (selectedLevel !== "all") params.set("level", selectedLevel);
      if (selectedMajor !== "all") params.set("major", selectedMajor);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (selectedMatch !== "all") params.set("match", selectedMatch);

      const res = await fetch(`/api/employment?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setGraduatesData(json.data || []);
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
  }, [selectedYear, selectedLevel, selectedMajor]);

  useEffect(() => {
    fetchGraduates();
  }, [page, searchTerm, selectedYear, selectedLevel, selectedMajor, selectedStatus, selectedMatch]);

  const handleResetFilters = () => {
    setSelectedYear("all");
    setSelectedLevel("all");
    setSelectedMajor("all");
    setSelectedStatus("all");
    setSelectedMatch("all");
    setSearchTerm("");
    setPage(1);
  };

  const employmentStats = stats?.employmentStats || {};
  const filterMeta = stats?.filters || { years: [], majors: [] };

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
        onYearChange={(y) => {
          setSelectedYear(y);
          setPage(1);
        }}
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
        years={filterMeta.years}
        majors={filterMeta.majors}
        onReset={handleResetFilters}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="ผู้สำเร็จการศึกษาทั้งหมด"
          value={`${employmentStats.totalGraduates?.toLocaleString() || 0} คน`}
          subtitle="ตามเงื่อนไขตัวกรอง"
          icon={GraduationCap}
          color="indigo"
        />

        <StatCard
          title="มีงานทำแล้ว"
          value={`${employmentStats.employmentRate || 0}%`}
          subtitle={`${employmentStats.employedCount?.toLocaleString() || 0} คน`}
          icon={Briefcase}
          color="emerald"
        />

        <StatCard
          title="ศึกษาต่อระดับสูงขึ้น"
          value={`${employmentStats.studyRate || 0}%`}
          subtitle={`${employmentStats.studyCount?.toLocaleString() || 0} คน`}
          icon={TrendingUp}
          color="blue"
        />

        <StatCard
          title="ทำงานตรงสาขาวิชา"
          value={`${employmentStats.matchRate || 0}%`}
          subtitle={`${employmentStats.jobMatchedCount?.toLocaleString() || 0} คน (ตรงสาย)`}
          icon={DollarSign}
          color="purple"
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
              <span className="text-slate-600">อัตราว่างงาน</span>
              <span className="font-bold text-rose-600">
                {employmentStats.totalGraduates > 0
                  ? ((employmentStats.unemployedCount / employmentStats.totalGraduates) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">รายละเอียดรายบุคคล</h2>
        </div>
        <GraduatesTable
          graduates={graduatesData}
          pagination={pagination}
          searchTerm={searchTerm === "all" ? "" : searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setPage(1);
          }}
          onPageChange={setPage}
          selectedStatus={selectedStatus}
          onStatusChange={(st) => {
            setSelectedStatus(st);
            setPage(1);
          }}
          selectedMatch={selectedMatch}
          onMatchChange={(m) => {
            setSelectedMatch(m);
            setPage(1);
          }}
          loading={loading}
        />
      </div>
    </div>
  );
}
