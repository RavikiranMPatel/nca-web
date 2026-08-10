import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Activity } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  injuryService,
  INJURY_LOCATIONS,
  INJURY_STATUSES,
} from "../../api/playerService/injuryService.ts";
import type {
  InjuryDashboardResponse,
  BreakdownItem,
} from "../../api/playerService/injuryService.ts";

function MetricCard({
  label,
  value,
  sub,
  color = "text-slate-900",
  bg = "bg-white",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  bg?: string;
}) {
  return (
    <div className={`${bg} rounded-xl border border-slate-200 p-4 shadow-sm`}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BreakdownBar({ items, total }: { items: BreakdownItem[]; total: number }) {
  if (!items.length) return <p className="text-xs text-slate-400 py-2">No data</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-slate-700 truncate max-w-[60%]">{item.label}</span>
              <span className="text-xs font-semibold text-slate-600">{item.count} ({pct}%)</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = INJURY_STATUSES[status] || { label: status, color: "text-slate-700", bg: "bg-slate-100" };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
      {s.label}
    </span>
  );
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function InjuriesDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<InjuryDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    injuryService
      .dashboard()
      .then(setData)
      .catch(() => toast.error("Failed to load injuries dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-9 h-9 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const locationItems = data.locationBreakdown.map((i) => ({
    ...i,
    label: INJURY_LOCATIONS[i.label] || i.label,
  }));

  return (
    <div className="space-y-6 pb-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity size={22} className="text-red-500 flex-shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Injuries &amp; Fitness</h1>
            <p className="text-xs text-slate-500">Academy-wide injury tracker</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/admin/players")}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus size={15} /> Record Injury
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Total Injuries"
          value={data.totalInjuries}
          bg="bg-white"
        />
        <MetricCard
          label="Active"
          value={data.activeInjuries}
          color="text-red-600"
          bg="bg-red-50"
          sub="Under Rehab + Recovering"
        />
        <MetricCard
          label="Recovered"
          value={data.recovered}
          color="text-green-700"
          bg="bg-green-50"
        />
        <MetricCard
          label="Avg Recovery"
          value={data.avgRecoveryDays != null ? `${data.avgRecoveryDays}d` : "—"}
          color="text-blue-700"
          bg="bg-blue-50"
          sub={data.avgRecoveryDays != null ? "avg days to recover" : "No completed recoveries"}
        />
      </div>

      {/* Breakdown bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3">By Body Part</h3>
          <BreakdownBar items={data.bodyPartBreakdown} total={data.totalInjuries} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Where It Happened</h3>
          <BreakdownBar items={locationItems} total={data.totalInjuries} />
        </div>
      </div>

      {/* Recent injuries table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Recent Injuries</h3>
          <span className="text-xs text-slate-400">Latest 10</span>
        </div>

        {data.recentInjuries.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2">🩹</div>
            <p className="text-sm text-slate-500">No injuries recorded yet</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Player</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Body Part</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.recentInjuries.map((inj) => (
                    <tr
                      key={inj.publicId}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/players/${inj.playerPublicId}/injuries`)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{inj.playerName}</td>
                      <td className="px-4 py-3 text-slate-700">{inj.bodyPart}</td>
                      <td className="px-4 py-3 text-slate-500">{inj.injuryType || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(inj.injuryDate)}</td>
                      <td className="px-4 py-3"><StatusPill status={inj.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-slate-100">
              {data.recentInjuries.map((inj) => (
                <div
                  key={inj.publicId}
                  className="px-4 py-3 flex items-center justify-between gap-2 cursor-pointer active:bg-slate-50"
                  onClick={() => navigate(`/admin/players/${inj.playerPublicId}/injuries`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{inj.playerName}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {inj.bodyPart}{inj.injuryType ? ` — ${inj.injuryType}` : ""} · {formatDate(inj.injuryDate)}
                    </p>
                  </div>
                  <StatusPill status={inj.status} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default InjuriesDashboardPage;
