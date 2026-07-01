import { useEffect, useState } from 'react';
import PlatformAdminNav from '../components/PlatformAdminNav';
import platformAdminApi from '../api/platformAdminApi';
import type { PlatformEvent } from '../types';

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString('en-IN') : '—');

const severityBadge = (s: PlatformEvent['severity']) => {
  if (s === 'CRITICAL') return 'bg-red-100 text-red-800';
  if (s === 'WARNING') return 'bg-yellow-100 text-yellow-800';
  return 'bg-blue-100 text-blue-800';
};

const severityOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };

const sortEvents = (events: PlatformEvent[]): PlatformEvent[] =>
  [...events].sort((a, b) => {
    const so = severityOrder[a.severity] - severityOrder[b.severity];
    if (so !== 0) return so;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

export default function PlatformAdminEvents() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    platformAdminApi
      .get<PlatformEvent[]>('/events')
      .then((res) => setEvents(sortEvents(res.data)))
      .catch(() => setError('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <PlatformAdminNav />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Events</h1>

        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
                <tr>
                  {['Severity', 'Event Type', 'Message', 'Academy ID', 'Time'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No events</td></tr>
                )}
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${severityBadge(ev.severity)}`}>
                        {ev.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {ev.eventType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-sm">{ev.message}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {ev.academyId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(ev.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
