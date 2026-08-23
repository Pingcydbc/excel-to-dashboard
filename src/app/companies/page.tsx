"use client";

import { useState, useEffect } from "react";
import { Building2, Users, Briefcase, Award, ArrowLeft } from "lucide-react";
import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import StatCard from "@/components/StatCard";
import CompaniesTable from "@/components/tables/CompaniesTable";
import TopCompaniesBarChart from "@/components/charts/TopCompaniesBarChart";

export default function CompaniesPage() {
  const [selectedMajor, setSelectedMajor] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [companiesData, setCompaniesData] = useState<any[]>([]);
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

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");
      if (searchTerm) params.set("search", searchTerm);
      if (selectedMajor !== "all") params.set("major", selectedMajor);

      const res = await fetch(`/api/companies?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setCompaniesData(json.data || []);
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
  }, [selectedMajor]);

  useEffect(() => {
    fetchCompanies();
  }, [page, searchTerm, selectedMajor]);

  const handleResetFilters = () => {
    setSelectedMajor("all");
    setSearchTerm("");
    setPage(1);
  };

  const companyStats = stats?.companyStats || {};
  const filterMeta = stats?.filters || { majors: [] };

  return (
    <div className="space-y-6" id="companies-content">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าหลัก
            </Link>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">เสาหลักที่ 3</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            ข้อมูลและสถิติสถานประกอบการ (Company Analytics)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            รวบรวมสถานประกอบการที่รับนักศึกษาเข้าทำงาน อันดับสถานประกอบการยอดนิยม และตำแหน่งงานหลัก
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        selectedYear="all"
        onYearChange={() => {}}
        selectedLevel="all"
        onLevelChange={() => {}}
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
          title="สถานประกอบการทั้งหมด"
          value={`${companyStats.totalUniqueCompanies?.toLocaleString() || 0} แห่ง`}
          subtitle="ที่มีการจ้างงานผู้สำเร็จการศึกษา"
          icon={Building2}
          color="indigo"
        />

        <StatCard
          title="สถานประกอบการอันดับ 1"
          value={companyStats.topCompanies?.[0]?.companyName?.substring(0, 15) || "-"}
          subtitle={`รับทำงาน ${companyStats.topCompanies?.[0]?.count || 0} คน`}
          icon={Award}
          color="purple"
        />

        <StatCard
          title="ตำแหน่งงานยอดนิยม"
          value={companyStats.topCompanies?.[0]?.topPosition || "ช่างเทคนิค"}
          subtitle="สายงานที่มีความต้องการสูง"
          icon={Briefcase}
          color="emerald"
        />

        <StatCard
          title="การจ้างงานใน Top 10"
          value={`${(companyStats.topCompanies || []).reduce((acc: number, cur: any) => acc + (cur.count || 0), 0)} คน`}
          subtitle="สัดส่วนในสถานประกอบการหลัก"
          icon={Users}
          color="blue"
        />
      </div>

      {/* Top Companies Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TopCompaniesBarChart data={companyStats.topCompanies || []} />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">บทวิเคราะห์ความต้องการแรงงาน</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              สถานประกอบการภาคอุตสาหกรรม การผลิต ยานยนต์ และเทคโนโลยีสารสนเทศเป็นกลุ่มหลักที่รับนักศึกษาเข้าทำงานอย่างต่อเนื่อง การสร้างความร่วมมือทวิภาคีกับสถานประกอบการเหล่านี้ช่วยยกระดับอัตราการมีงานทำตรงสายอย่างยั่งยืน
            </p>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
            <span className="font-bold block mb-1">กลยุทธ์การเชื่อมโยงสถานประกอบการ</span>
            เพิ่มการฝึกงานภาคปฏิบัติและพัฒนาทักษะเฉพาะทางตามความต้องการของสถานประกอบการ Top 10
          </div>
        </div>
      </div>

      {/* Companies Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">รายชื่อสถานประกอบการทั้งหมดและการจ้างงาน</h2>
        </div>
        <CompaniesTable
          companies={companiesData}
          pagination={pagination}
          searchTerm={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setPage(1);
          }}
          onPageChange={setPage}
          loading={loading}
        />
      </div>
    </div>
  );
}
