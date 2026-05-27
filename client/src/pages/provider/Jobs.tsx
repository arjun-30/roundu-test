import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Clock, Calendar, MapPin, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

import { getServiceById } from "@/data/mockData";
import ProviderBottomNav from "@/components/ProviderBottomNav";
import EmptyState from "@/components/EmptyState";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

const Jobs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { providerRequests, completedJobs } = useApp();
  const [tab, setTab] = useState<"upcoming" | "active" | "completed">("upcoming");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

// Persist date range in localStorage
useEffect(() => {
  const raw = localStorage.getItem('jobsDateRange');
  if (raw) {
    try {
      const obj = JSON.parse(raw);
      setDateRange({
        from: obj.from ? new Date(obj.from) : undefined,
        to: obj.to ? new Date(obj.to) : undefined,
      });
    } catch {}
  }
}, []);

useEffect(() => {
  if (dateRange?.from || dateRange?.to) {
    const obj = {
      from: dateRange?.from?.toISOString(),
      to: dateRange?.to?.toISOString(),
    };
    localStorage.setItem('jobsDateRange', JSON.stringify(obj));
  } else {
    localStorage.removeItem('jobsDateRange');
  }
}, [dateRange]);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(location.state?.from === "profile" ? "/provider/profile" : "/provider");
    }
  };

  const parseJobDate = (dateStr: string) => {
    if (!dateStr || dateStr === "Today") return new Date();
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    try {
      return parseISO(dateStr);
    } catch (e) {
      return new Date();
    }
  };

  const filteredJobs = useMemo(() => {
    const filterByDate = (dateStr: string) => {
      if (!dateRange || (!dateRange.from && !dateRange.to)) {
        return true;
      }

      const jobDate = parseJobDate(dateStr);
      const start = dateRange.from ? startOfDay(dateRange.from) : startOfMonth(new Date());
      const end = dateRange.to ? endOfDay(dateRange.to) : (dateRange.from ? endOfDay(dateRange.from) : endOfMonth(new Date()));
      
      return isWithinInterval(jobDate, { start, end });
    };

    return {
      upcoming: providerRequests.filter(r => ["accepted", "assigned"].includes(r.status) && filterByDate(r.date)),
      active: providerRequests.filter(r => ["on_the_way", "arrived", "quote_set", "in_progress"].includes(r.status) && filterByDate(r.date)),
      completed: completedJobs.filter(r => filterByDate(r.date))
    };
  }, [providerRequests, completedJobs, dateRange]);

  const upcomingJobs = filteredJobs.upcoming;
  const activeJobs = filteredJobs.active;
  const completedJobsList = filteredJobs.completed;

  return (
    <div className="min-h-full flex flex-col bg-background pb-24 relative">
      <div className="px-5 pt-3 pb-2 flex items-center gap-3 animate-fade-in bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={handleBack} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">My Jobs</h1>
      </div>

      <div className="px-5 mt-6 flex gap-2">
        <button
          onClick={() => setTab("upcoming")}
          className={`flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all ${
            tab === "upcoming" ? "bg-primary text-primary-foreground shadow-sm" : "bg-input text-muted-foreground"
          }`}
        >
          Upcoming ({upcomingJobs.length})
        </button>
        <button
          onClick={() => setTab("active")}
          className={`flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all ${
            tab === "active" ? "bg-primary text-primary-foreground shadow-sm" : "bg-input text-muted-foreground"
          }`}
        >
          Active ({activeJobs.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all ${
            tab === "completed" ? "bg-primary text-primary-foreground shadow-sm" : "bg-input text-muted-foreground"
          }`}
        >
          Completed ({completedJobsList.length})
        </button>
      </div>

      <div className="px-5 mt-4">
        <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 mt-4">
        {tab === "upcoming" ? (
          upcomingJobs.length === 0 ? (
             <EmptyState icon={Calendar} title="No upcoming jobs" description="Jobs you accept will appear here." />
          ) : (
             <div className="space-y-3">
               {upcomingJobs.map((job) => {
                 const service = getServiceById(job.serviceId);
                 return (
                   <button
                     key={job.id}
                     onClick={() => navigate(`/provider/job/${job.id}`, { state: { from: location.state?.from === "profile" ? "profile" : "jobs" } })}
                     className="w-full bg-card border border-border rounded-2xl p-4 text-left active:scale-[0.98] shadow-card transition-transform"
                   >
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-bold text-foreground">{service?.label}</p>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-100 text-blue-700">
                          Upcoming
                        </span>
                     </div>
                     <p className="text-xs text-muted-foreground mb-3">{job.customerName}</p>
                     
                     <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar size={12}/> {job.date}</span>
                        <span className="flex items-center gap-1"><Clock size={12}/> {job.time}</span>
                        <span className="flex items-center gap-1 col-span-2 mt-1"><MapPin size={12}/> {job.address}</span>
                     </div>
                   </button>
                 )
               })}
             </div>
          )
        ) : tab === "active" ? (
          activeJobs.length === 0 ? (
             <EmptyState icon={Clock} title="No active jobs" description="Jobs you accept will appear here." />
          ) : (
             <div className="space-y-3">
               {activeJobs.map((job) => {
                 const service = getServiceById(job.serviceId);
                 return (
                   <button
                     key={job.id}
                     onClick={() => navigate(`/provider/job/${job.id}`, { state: { from: location.state?.from === "profile" ? "profile" : "jobs" } })}
                     className="w-full bg-card border border-border rounded-2xl p-4 text-left active:scale-[0.98] shadow-card transition-transform"
                   >
                     <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-bold text-foreground">{service?.label}</p>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${job.status === 'in_progress' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {job.status === 'in_progress' ? 'In Progress' : 'Upcoming'}
                        </span>
                     </div>
                     <p className="text-xs text-muted-foreground mb-3">{job.customerName}</p>
                     
                     <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar size={12}/> {job.date}</span>
                        <span className="flex items-center gap-1"><Clock size={12}/> {job.time}</span>
                        <span className="flex items-center gap-1 col-span-2 mt-1"><MapPin size={12}/> {job.address}</span>
                     </div>
                   </button>
                 )
               })}
             </div>
          )
        ) : (
          completedJobsList.length === 0 ? (
             <EmptyState icon={CheckCircle2} title="No completed jobs" description="Your completed jobs will be listed here." />
          ) : (
             <div className="space-y-3">
               {completedJobsList.map((job) => {
                 const service = getServiceById(job.serviceId);
                 return (
                   <div key={job.id} className="w-full bg-card border border-border rounded-2xl p-4 text-left shadow-sm opacity-80">
                     <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-bold text-foreground">{service?.label || "Service"}</p>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-success/10 text-success">
                          Completed
                        </span>
                     </div>
                     <p className="text-xs text-muted-foreground mb-2">{job.customerName}</p>
                     <p className="text-sm font-extrabold text-foreground mt-2">+₹{job.price}</p>
                   </div>
                 )
               })}
             </div>
          )
        )}
      </div>

      <ProviderBottomNav />
    </div>
  );
};

export default Jobs;
