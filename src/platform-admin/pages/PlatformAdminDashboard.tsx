import { useEffect, useState, useCallback } from 'react';
import {
  Building2, CheckCircle, Clock, XCircle, Server, AlertTriangle,
} from 'lucide-react';
import PlatformAdminNav from '../components/PlatformAdminNav';
import platformAdminApi from '../api/platformAdminApi';
import type { DashboardStats, PlatformEvent } from '../types';

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleString('en-IN') : '—';

const severityBadge = (s: string) => {
  if (s === 'CRITICAL') return 'bg-red-100 text-red-800';
  if (s === 'WARNING') return 'bg-yellow-100 text-yellow-800';
  return 'bg-blue-100 text-blue-800';
};

interface StatCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

export default function PlatformAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, eventsRes] = await Promise.all([
        platformAdminApi.get<DashboardStats>('/dashboard'),
        platformAdminApi.get<PlatformEvent[]>('/events'),
      ]);
      setStats(statsRes.data);
      setEvents(eventsRes.data.slice(0, 5));
      setError('');
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const cards: StatCard[] = stats
    ? [
        { label: 'Total Academies', value: stats.totalAcademies, icon: <Building2 size={22} />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
        { label: 'Active', value: stats.activeAcademies, icon: <CheckCircle size={22} />, color: 'bg-green-50 text-green-700 border-green-200' },
        { label: 'Pending', value: stats.pendingAcademies, icon: <Clock size={22} />, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        { label: 'Disabled', value: stats.disabledAcademies, icon: <XCircle size={22} />, color: 'bg-red-50 text-red-700 border-red-200' },
        { label: 'Servers', value: stats.totalServers, icon: <Server size={22} />, color: 'bg-purple-50 text-purple-700 border-purple-200' },
        { label: 'Alerts 24h', value: stats.recentAlerts, icon: <AlertTriangle size={22} />, color: 'bg-orange-50 text-orange-700 border-orange-200' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <PlatformAdminNav />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Dashboard</h1>

        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-xl border p-4 flex flex-col gap-2 ${card.color}`}
                >
                  <div className="opacity-70">{card.icon}</div>
                  <div className="text-3xl font-bold">{card.value}</div>
                  <div className="text-xs font-medium opacity-80">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Recent Events</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
                    <tr>
                      <th className="px-6 py-3 text-left">Severity</th>
                      <th className="px-6 py-3 text-left">Type</th>
                      <th className="px-6 py-3 text-left">Message</th>
                      <th className="px-6 py-3 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {events.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-gray-400 text-center">No recent events</td>
                      </tr>
                    )}
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${severityBadge(ev.severity)}`}>
                            {ev.severity}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-700 font-mono text-xs">{ev.eventType}</td>
                        <td className="px-6 py-3 text-gray-700 max-w-xs truncate">{ev.message}</td>
                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{fmt(ev.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
