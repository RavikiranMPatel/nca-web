import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import PlatformAdminNav from '../components/PlatformAdminNav';
import platformAdminApi from '../api/platformAdminApi';
import type { Server, RegisterServerRequest } from '../types';

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString('en-IN') : '—');

const statusBadge = (s: Server['status']) => {
  if (s === 'ACTIVE') return 'bg-green-100 text-green-800';
  if (s === 'FULL') return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-600';
};

function MetricBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400">—</span>;
  const pct = Math.min(100, Math.round(Number(value)));
  const color = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-400' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-700">{pct}%</span>
    </div>
  );
}

const emptyForm = (): RegisterServerRequest => ({
  name: '',
  ip: '',
  hetznerServerId: '',
  maxAcademies: 33,
});

export default function PlatformAdminServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<RegisterServerRequest>(emptyForm());
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchServers = async () => {
    try {
      const res = await platformAdminApi.get<Server[]>('/servers');
      setServers(res.data);
      setError('');
    } catch {
      setError('Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServers(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'maxAcademies' ? Number(value) : value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await platformAdminApi.post('/servers', {
        ...form,
        hetznerServerId: form.hetznerServerId || undefined,
      });
      setShowModal(false);
      setForm(emptyForm());
      fetchServers();
    } catch (err: any) {
      setFormError(err.response?.data?.error ?? 'Failed to register server');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PlatformAdminNav />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Servers</h1>
          <button
            onClick={() => { setShowModal(true); setFormError(''); setForm(emptyForm()); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Register Server
          </button>
        </div>

        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wide">
                <tr>
                  {['Name', 'IP', 'Status', 'CPU%', 'RAM%', 'Disk GB', 'Max Academies', 'Last Ping'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {servers.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No servers registered</td></tr>
                )}
                {servers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">{s.ip}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3"><MetricBar value={s.cpuPercent} /></td>
                    <td className="px-4 py-3"><MetricBar value={s.ramPercent} /></td>
                    <td className="px-4 py-3 text-gray-700">
                      {s.diskUsedGb !== null ? `${Number(s.diskUsedGb).toFixed(1)} GB` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{s.maxAcademies}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(s.lastPing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Register Server</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRegister} className="px-6 py-4 space-y-4">
              {[
                { label: 'Name *', name: 'name', placeholder: 'e.g. srv-1' },
                { label: 'IP *', name: 'ip', placeholder: '1.2.3.4' },
                { label: 'Hetzner Server ID (optional)', name: 'hetznerServerId', placeholder: 'optional' },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                  <input
                    type="text"
                    name={f.name}
                    value={(form as any)[f.name] ?? ''}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    required={f.label.endsWith('*')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Academies</label>
                <input
                  type="number"
                  name="maxAcademies"
                  value={form.maxAcademies ?? 33}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  {formLoading ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
