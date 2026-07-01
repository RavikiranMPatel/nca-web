import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import PlatformAdminNav from '../components/PlatformAdminNav';
import platformAdminApi from '../api/platformAdminApi';
import type { BackupLog } from '../types';

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString('en-IN') : '—');

const statusBadge = (s: BackupLog['status']) =>
  s === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

export default function PlatformAdminBackups() {
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const fetchBackups = async () => {
    try {
      const res = await platformAdminApi.get<BackupLog[]>('/backups');
      setBackups(res.data);
      setError('');
    } catch {
      setError('Failed to load backup logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBackups(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleRunAll = async () => {
    if (!confirm('Trigger backup for all academies?')) return;
    try {
      await platformAdminApi.post('/backups');
      showToast('Backup triggered for all academies');
    } catch {
      showToast('Failed to trigger backup');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PlatformAdminNav />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Backups</h1>
          <button
            onClick={handleRunAll}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} /> Run All Backups
          </button>
        </div>

        {toast && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm">
            {toast}
          </div>
        )}

        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
                <tr>
                  {['Academy ID', 'Status', 'Backed Up At', 'Size (MB)', 'Drive Path', 'Error'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {backups.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No backup logs</td></tr>
                )}
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.academyId}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(b.backedUpAt)}</td>
                    <td className="px-4 py-3 text-gray-700">{b.sizeMb !== null ? Number(b.sizeMb).toFixed(2) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate font-mono text-xs">
                      {b.drivePath ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {b.errorMessage ? (
                        <span className="text-red-600 text-xs">{b.errorMessage}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
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
