import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Clock, Calendar, MapPin, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getServiceById } from "@/data/mockData";
import ProviderBottomNav from "@/components/ProviderBottomNav";
import EmptyState from "@/components/EmptyState";
import { Calendar as DateRangeCalendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import {
  isWithinInterval,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore,
  startOfToday,
  startOfWeek,
  endOfWeek,
  startOfYear,
  format,
  isSameDay,
} from "date-fns";

type JobTab = "upcoming" | "active" | "completed";
type JobsDateRanges = Record<JobTab, DateRange | undefined>;

const emptyDateRanges: JobsDateRanges = {
  upcoming: undefined,
  active: undefined,
  completed: undefined,
};

const Jobs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { providerRequests, completedJobs } = useApp();
  const [tab, setTab] = useState<JobTab>("active");
  const [dateRanges, setDateRanges] = useState<JobsDateRanges>(emptyDateRanges);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarClosing, setCalendarClosing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"today" | "week" | "month">("week");
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const today = startOfToday();
  const dateRange = dateRanges[tab];

  // Persist date range in localStorage
  useEffect(() => {
    const raw = localStorage.getItem("jobsDateRanges");
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        setDateRanges({
          upcoming: obj.upcoming ? {
            from: obj.upcoming.from ? new Date(obj.upcoming.from) : undefined,
            to: obj.upcoming.to ? new Date(obj.upcoming.to) : undefined,
          } : undefined,
          active: obj.active ? {
            from: obj.active.from ? new Date(obj.active.from) : undefined,
            to: obj.active.to ? new Date(obj.active.to) : undefined,
          } : undefined,
          completed: obj.completed ? {
            from: obj.completed.from ? new Date(obj.completed.from) : undefined,
            to: obj.completed.to ? new Date(obj.completed.to) : undefined,
          } : undefined,
        });
      } catch { }
      return;
    }

    const legacyRaw = localStorage.getItem("jobsDateRange");
    if (legacyRaw) {
      try {
        const obj = JSON.parse(legacyRaw);
        setDateRanges((prev) => ({
          ...prev,
          upcoming: {
            from: obj.from ? new Date(obj.from) : undefined,
            to: obj.to ? new Date(obj.to) : undefined,
          },
        }));
      } catch { }
    }
  }, []);

  useEffect(() => {
    const hasRange = Object.values(dateRanges).some((range) => range?.from || range?.to);

    if (hasRange) {
      localStorage.setItem("jobsDateRanges", JSON.stringify({
        upcoming: dateRanges.upcoming ? {
          from: dateRanges.upcoming.from?.toISOString(),
          to: dateRanges.upcoming.to?.toISOString(),
        } : undefined,
        active: dateRanges.active ? {
          from: dateRanges.active.from?.toISOString(),
          to: dateRanges.active.to?.toISOString(),
        } : undefined,
        completed: dateRanges.completed ? {
          from: dateRanges.completed.from?.toISOString(),
          to: dateRanges.completed.to?.toISOString(),
        } : undefined,
      }));
    } else {
      localStorage.removeItem("jobsDateRanges");
    }
    localStorage.removeItem("jobsDateRange");
  }, [dateRanges]);

  useEffect(() => {
    setCalendarOpen(false);
    setCalendarClosing(false);
  }, [tab]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

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

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return "Select date range";

    if (range.to) {
      return `${format(range.from, "MMM dd")} - ${format(range.to, "MMM dd")}`;
    }

    return format(range.from, "MMM dd");
  };

  const getTabStyles = (targetTab: JobTab) => {
    return {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      softText: "text-amber-600",
      selected: "bg-amber-500 text-white hover:bg-amber-500 focus:bg-amber-500",
      middle: "aria-selected:bg-amber-100 aria-selected:text-amber-800",
    };
  };

  const getDisabledDate = (targetTab: JobTab) => {
    if (targetTab === "upcoming") {
      return (day: Date) => isBefore(day, today);
    }

    if (targetTab === "completed") {
      return (day: Date) => !isBefore(day, today);
    }

    if (targetTab === "active") {
      // Only allow selecting today; disable all other dates
      return (day: Date) => !isSameDay(day, today);
    }

    // Fallback (should not reach here)
    return () => false;
  };

  const openCalendar = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    setCalendarClosing(false);
    setCalendarOpen(true);
  };

  const closeCalendar = (scrollToResults = false) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    setCalendarClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setCalendarOpen(false);
      setCalendarClosing(false);

      if (scrollToResults) {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 180);
  };

  const handleDateRangeChange = (newRange: DateRange | undefined) => {
    setDateRanges((prev) => ({
      ...prev,
      [tab]: newRange,
    }));

    if (newRange?.from && newRange?.to) {
      closeCalendar(true);
    }
  };

  const DateRangeControl = ({ label }: { label: string }) => {
    const styles = getTabStyles(tab);
    const shouldRenderCalendar = calendarOpen || calendarClosing;

    return (
      <div className="px-5 mt-3">
        <button
          type="button"
          onClick={openCalendar}
          aria-expanded={calendarOpen && !calendarClosing}
          className={`w-full min-h-14 flex items-center gap-3 ${styles.bg} ${styles.border} border rounded-xl px-4 py-3 text-left active:scale-[0.98] transition-transform shadow-sm`}
        >
          <span className={`h-10 w-10 rounded-xl bg-white/80 ${styles.border} border flex items-center justify-center ${styles.text} shrink-0`}>
            <Calendar size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-[11px] font-bold uppercase tracking-wide ${styles.softText}`}>
              {label}
            </span>
            <span className={`block truncate text-sm font-extrabold ${styles.text}`}>
              {formatDateRange(dateRange)}
            </span>
          </span>
        </button>

        {shouldRenderCalendar && (
          <div
            className={`mt-2 overflow-hidden rounded-xl border ${styles.border} bg-white shadow-sm origin-top ${
              calendarClosing
                ? "animate-out fade-out zoom-out-95 slide-out-to-top-2 duration-200"
                : "animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
            }`}
          >
            <DateRangeCalendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from || (tab === "completed" ? startOfMonth(today) : today)}
              selected={dateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={1}
              disabled={getDisabledDate(tab)}
              className="p-3"
              classNames={{
                months: "flex flex-col",
                month: "space-y-3 w-full",
                head_cell: "text-muted-foreground rounded-md w-10 flex-1 font-bold text-[0.72rem]",
                cell: "h-10 flex-1 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-10 w-10 mx-auto p-0 font-bold rounded-xl hover:bg-input aria-selected:opacity-100",
                day_selected: styles.selected,
                day_today: `border-2 ${tab === "active" ? "border-amber-500 bg-white text-amber-700" : "border-foreground/30"}`,
                day_disabled: "text-muted-foreground opacity-25 cursor-not-allowed bg-transparent hover:bg-transparent",
                day_range_middle: styles.middle,
                day_outside: "day-outside text-muted-foreground opacity-20 aria-selected:opacity-30",
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // Get filter range for Active tab based on selected chip
  const getActiveFilterRange = (): { start: Date; end: Date } => {
    const today = startOfToday();
    switch (activeFilter) {
      case "today":
        return { start: today, end: endOfDay(today) };
      case "week":
        return { start: startOfWeek(today), end: endOfWeek(today) };
      case "month":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      default:
        return { start: startOfWeek(today), end: endOfWeek(today) };
    }
  };

  const filteredJobs = useMemo(() => {
    const now = new Date();
    const upcomingRange = dateRanges.upcoming;
    const activeRange = dateRanges.active;
    const completedRange = dateRanges.completed;

    // Upcoming jobs: only future jobs
    const upcomingList = providerRequests.filter((r) => {
      const isUpcomingStatus = [
        "pending",
        "accepted",
        "assigned",
        "quote_set",
        "quote_accepted",
        "scheduled",
      ].includes(r.status);

      if (!isUpcomingStatus) return false;

      const jobDate = parseJobDate(r.date);
      // Only show jobs that are today or in the future
      return !isBefore(jobDate, startOfDay(now));
    });

    // Apply date range filter only if dates are selected
    const filteredUpcoming = upcomingRange?.from || upcomingRange?.to
      ? upcomingList.filter((r) => {
        const jobDate = parseJobDate(r.date);
        const start = upcomingRange.from ? startOfDay(upcomingRange.from) : startOfMonth(now);
        const end = upcomingRange.to ? endOfDay(upcomingRange.to) : (upcomingRange.from ? endOfDay(upcomingRange.from) : endOfMonth(now));
        return isWithinInterval(jobDate, { start, end });
      })
      : upcomingList;

    // Active jobs: only current/in-progress jobs, filtered by chip selection
    const activeList = providerRequests.filter((r) => {
      const isActiveStatus = [
        "on_the_way",
        "arrived",
        "in_progress",
        "payment_pending",
      ].includes(r.status);
      return isActiveStatus;
    });

    // Apply active filter range, then selected date range if present
    const { start: filterStart, end: filterEnd } = getActiveFilterRange();
    const filteredActive = activeList.filter((r) => {
      const jobDate = parseJobDate(r.date);
      const activePeriod = isWithinInterval(jobDate, { start: startOfDay(filterStart), end: endOfDay(filterEnd) });
      if (!activePeriod) return false;

      if (activeRange?.from || activeRange?.to) {
        const start = activeRange.from ? startOfDay(activeRange.from) : startOfDay(filterStart);
        const end = activeRange.to ? endOfDay(activeRange.to) : (activeRange.from ? endOfDay(activeRange.from) : endOfDay(filterEnd));
        return isWithinInterval(jobDate, { start, end });
      }

      return true;
    });

    // Completed jobs: only past jobs
    const completedList = [
      ...providerRequests.filter((r) => ["paid"].includes(r.status)),
      ...completedJobs,
    ].filter((r) => {
      const jobDate = parseJobDate(r.date);
      // Only show jobs that are before today (completed in the past)
      return isBefore(jobDate, startOfDay(now));
    });

    // Apply date range filter only if dates are selected
    const filteredCompleted = completedRange?.from || completedRange?.to
      ? completedList.filter((r) => {
        const jobDate = parseJobDate(r.date);
        const start = completedRange.from ? startOfDay(completedRange.from) : startOfYear(now);
        const end = completedRange.to ? endOfDay(completedRange.to) : (completedRange.from ? endOfDay(completedRange.from) : endOfDay(now));
        return isWithinInterval(jobDate, { start, end });
      })
      : completedList;

    return {
      upcoming: filteredUpcoming,
      active: filteredActive,
      completed: filteredCompleted,
    };
  }, [providerRequests, completedJobs, dateRanges, activeFilter]);

  const upcomingJobs = filteredJobs.upcoming;
  const activeJobs = filteredJobs.active;
  const completedJobsList = filteredJobs.completed;

  // Calculate statistics
  const upcomingEarnings = upcomingJobs.reduce((sum, job) => sum + (job.price || 0), 0);
  const activeTodayEarnings = activeJobs
    .filter((job) => isSameDay(parseJobDate(job.date), today))
    .reduce((sum, job) => sum + (job.price || 0), 0);
  const completedEarnings = completedJobsList.reduce((sum, job) => sum + (job.price || 0), 0);


  return (
    <div className="min-h-full flex flex-col bg-background pb-24 relative">
      {/* Header */}
      <div className="px-5 pt-3 pb-2 flex items-center gap-3 animate-fade-in bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={handleBack} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">My Jobs</h1>
      </div>

      {/* Tab Buttons */}
      <div className="px-5 mt-6 flex gap-2">
        <button
          onClick={() => setTab("active")}
          className={`flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all ${tab === "active"
            ? "bg-amber-500 text-white shadow-md"
            : "bg-input text-muted-foreground hover:bg-input/80"
            }`}
        >
          Active ({activeJobs.length})
        </button>
        <button
          onClick={() => setTab("upcoming")}
          className={`flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all ${tab === "upcoming"
            ? "bg-amber-500 text-white shadow-md"
            : "bg-input text-muted-foreground hover:bg-input/80"
            }`}
        >
          Upcoming ({upcomingJobs.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all ${tab === "completed"
            ? "bg-amber-500 text-white shadow-md"
            : "bg-input text-muted-foreground hover:bg-input/80"
            }`}
        >
          Completed ({completedJobsList.length})
        </button>
      </div>

      {/* UPCOMING TAB */}
      {tab === "upcoming" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Stats Card */}
          <div className="px-5 mt-4 flex gap-2">
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[11px] text-amber-600 font-semibold">Expected Earnings</p>
              <p className="text-lg font-bold text-amber-700 mt-1">₹{upcomingEarnings}</p>
            </div>
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[11px] text-amber-600 font-semibold">Job Count</p>
              <p className="text-lg font-bold text-amber-700 mt-1">{upcomingJobs.length}</p>
            </div>
          </div>

          <DateRangeControl label="Scheduled Jobs" />

          {/* Legend */}
          <div ref={resultsRef} className="px-5 mt-3 flex items-center gap-2 scroll-mt-24">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-[11px] text-muted-foreground">Scheduled Job</span>
          </div>

          {/* Job List */}
          <div className="flex-1 overflow-y-auto px-5 mt-3">
            {upcomingJobs.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No upcoming jobs scheduled"
                description="New jobs will appear here when you accept bookings."
              />
            ) : (
              <div className="space-y-3">
                {upcomingJobs.map((job) => {
                  const service = getServiceById(job.serviceId);
                  return (
                    <button
                      key={job.id}
                      onClick={() => navigate(`/provider/job/${job.id}`, { state: { from: location.state?.from === "profile" ? "profile" : "jobs" } })}
                      className="w-full bg-white border-2 border-amber-100 rounded-2xl p-4 text-left active:scale-[0.98] shadow-sm hover:border-amber-300 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          <p className="text-sm font-bold text-foreground">{service?.label}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-100 text-amber-700">
                          Scheduled
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{job.customerName}</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {job.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {job.time}
                        </span>
                        <span className="flex items-center gap-1 col-span-2 mt-1">
                          <MapPin size={12} /> {job.address}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-amber-700 mt-3">₹{job.price}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE TAB */}
      {tab === "active" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Stats Cards */}
          <div className="px-5 mt-4 flex gap-2">
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[11px] text-amber-600 font-semibold">Today's Earnings</p>
              <p className="text-lg font-bold text-amber-700 mt-1">₹{activeTodayEarnings}</p>
            </div>
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[11px] text-amber-600 font-semibold">Active Jobs</p>
              <p className="text-lg font-bold text-amber-700 mt-1">{activeJobs.length}</p>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="px-5 mt-4 flex gap-2">
            {(["today", "week", "month"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setActiveFilter(filter);
                  setDateRanges((prev) => ({ ...prev, active: undefined }));
                }}
                className={`flex-1 py-2 px-3 text-[11px] font-bold rounded-lg transition-all ${activeFilter === filter
                  ? "bg-amber-500 text-white shadow-md"
                  : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                  }`}
              >
                {filter === "today" && "Today"}
                {filter === "week" && "This Week"}
                {filter === "month" && "This Month"}
              </button>
            ))}
          </div>

          <DateRangeControl label="Active Jobs" />

          {/* Legend */}
          <div ref={resultsRef} className="px-5 mt-3 flex items-center gap-2 scroll-mt-24">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-[11px] text-muted-foreground">In Progress</span>
          </div>

          {/* Job List */}
          <div className="flex-1 overflow-y-auto px-5 mt-3">
            {activeJobs.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No active jobs right now"
                description="Jobs in progress will appear here. Stay focused!"
              />
            ) : (
              <div className="space-y-3">
                {activeJobs.map((job) => {
                  const service = getServiceById(job.serviceId);
                  const statusConfig = {
                    on_the_way: { label: "On The Way", color: "bg-amber-100 text-amber-700" },
                    arrived: { label: "Arrived", color: "bg-amber-100 text-amber-700" },
                    in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
                    payment_pending: { label: "Payment Pending", color: "bg-amber-100 text-amber-700" },
                  };
                  const config = statusConfig[job.status as keyof typeof statusConfig] || { label: job.status, color: "bg-gray-100 text-gray-700" };

                  return (
                    <button
                      key={job.id}
                      onClick={() => navigate(`/provider/job/${job.id}`, { state: { from: location.state?.from === "profile" ? "profile" : "jobs" } })}
                      className="w-full bg-white border-2 border-amber-100 rounded-2xl p-4 text-left active:scale-[0.98] shadow-sm hover:border-amber-300 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                          <p className="text-sm font-bold text-foreground">{service?.label}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{job.customerName}</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {job.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {job.time}
                        </span>
                        <span className="flex items-center gap-1 col-span-2 mt-1">
                          <MapPin size={12} /> {job.address}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPLETED TAB */}
      {tab === "completed" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Stats Cards */}
          <div className="px-5 mt-4 flex gap-2">
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[11px] text-amber-600 font-semibold">Total Earnings</p>
              <p className="text-lg font-bold text-amber-700 mt-1">₹{completedEarnings}</p>
            </div>
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-[11px] text-amber-600 font-semibold">Completed</p>
              <p className="text-lg font-bold text-amber-700 mt-1">{completedJobsList.length}</p>
            </div>
          </div>

          <DateRangeControl label="Completed Jobs" />

          {/* Legend */}
          <div ref={resultsRef} className="px-5 mt-3 flex items-center gap-2 scroll-mt-24">
            <CheckCircle2 size={14} className="text-amber-600" />
            <span className="text-[11px] text-muted-foreground">Completed Job</span>
          </div>

          {/* Job List */}
          <div className="flex-1 overflow-y-auto px-5 mt-3">
            {completedJobsList.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No completed jobs found"
                description="Your completed jobs will appear here with earnings."
              />
            ) : (
              <div className="space-y-3">
                {completedJobsList.map((job) => {
                  const service = getServiceById(job.serviceId);
                  return (
                    <div
                      key={job.id}
                      className="w-full bg-white border-2 border-amber-100 rounded-2xl p-4 text-left shadow-sm hover:border-amber-300 transition-all opacity-90"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-amber-600" />
                          <p className="text-sm font-bold text-foreground">{service?.label || "Service"}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-100 text-amber-700">
                          Completed
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{job.customerName}</p>
                      <p className="text-[11px] text-muted-foreground mb-2">{job.date}</p>
                      <p className="text-sm font-extrabold text-amber-700">+₹{job.price}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <ProviderBottomNav />
    </div>
  );
};

export default Jobs;
