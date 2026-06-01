import { useState, ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (row: T) => ReactNode;
    className?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
    columns: Column<T>[];
    data: T[];
    pageSize?: number;
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    rowKey: (row: T) => string;
}

export default function DataTable<T extends Record<string, unknown>>({
    columns,
    data,
    pageSize = 20,
    loading = false,
    emptyMessage = "No data found.",
    onRowClick,
    rowKey,
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(1);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(d => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
        setPage(1);
    };

    const sorted = [...data].sort((a, b) => {
        if (!sortKey) return 0;
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
    });

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

    const SortIcon = ({ col }: { col: Column<T> }) => {
        if (!col.sortable) return null;
        if (sortKey !== col.key) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300 ml-1 inline" />;
        return sortDir === "asc"
            ? <ChevronUp className="w-3.5 h-3.5 text-[#17375E] ml-1 inline" />
            : <ChevronDown className="w-3.5 h-3.5 text-[#17375E] ml-1 inline" />;
    };

    if (loading) {
        return (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {columns.map(col => (
                                <th key={col.key} className="px-4 py-3 text-left font-semibold text-slate-500">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                                {columns.map(col => (
                                    <td key={col.key} className="px-4 py-3">
                                        <div className="h-4 rounded bg-slate-100 animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <ChevronsUpDown className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-sm min-w-[600px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 text-left font-semibold text-slate-500 whitespace-nowrap ${col.sortable ? "cursor-pointer hover:text-slate-700 select-none" : ""} ${col.className ?? ""}`}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    {col.label}
                                    <SortIcon col={col} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((row, i) => (
                            <tr
                                key={rowKey(row)}
                                onClick={() => onRowClick?.(row)}
                                className={`border-b border-slate-50 last:border-0 transition-colors duration-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                                    } ${onRowClick ? "cursor-pointer hover:bg-blue-50/50" : "hover:bg-slate-50"}`}
                            >
                                {columns.map(col => (
                                    <td key={col.key} className={`px-4 py-3 text-slate-700 ${col.className ?? ""}`}>
                                        {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-1">
                    <p className="text-sm text-slate-500">
                        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.length)} of {data.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let p = i + 1;
                            if (totalPages > 5) {
                                if (page <= 3) p = i + 1;
                                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                                else p = page - 2 + i;
                            }
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === p
                                            ? "bg-[#17375E] text-white"
                                            : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        }`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}