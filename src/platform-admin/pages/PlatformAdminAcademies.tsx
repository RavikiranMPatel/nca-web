import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import PlatformAdminNav from '../components/PlatformAdminNav';
import platformAdminApi from '../api/platformAdminApi';
import type { Academy, CreateAcademyRequest } from '../types';

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString('en-IN') : '—');

const statusBadge = (status: Academy['status']) => {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    DISABLED: 'bg-red-100 text-red-800',
    DELETED: 'bg-gray-100 text-gray-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
};

const emptyForm = (): CreateAcademyRequest => ({
  slug: '',
  name: '',
  domain: '',
  plan: 'BASIC',
  dbHost: 'localhost',
  dbPort: 5432,
  dbName: '',
  dbUsername: '',
  dbPassword: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  expiresAt: '',
  serverId: '',
});

export default function PlatformAdminAcademies() {
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateAcademyRequest>(emptyForm());
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState('');

  const fetchAcademies = async () => {
    try {
      const res = await platformAdminApi.get<Academy[]>('/academies');
      setAcademies(res.data);
      setError('');
    } catch {
      setError('Failed to load academies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAcademies(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleEnable = async (id: string) => {
    await platformAdminApi.post(`/academies/${id}/enable`);
    fetchAcademies();
  };

  const handleDisable = async (id: string) => {
    await platformAdminApi.post(`/academies/${id}/disable`);
    fetchAcademies();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This is a soft-delete.`)) return;
    await platformAdminApi.delete(`/academies/${id}`);
    fetchAcademies();
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'dbPort' ? Number(value) : value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const payload: CreateAcademyRequest = {
        ...form,
        serverId: form.serverId || undefined,
        ownerPhone: form.ownerPhone || undefined,
        expiresAt: form.expiresAt || undefined,
      };
      await platformAdminApi.post('/academies', payload);
      setShowModal(false);
      setForm(emptyForm());
      fetchAcademies();
      showToast('Academy created successfully');
    } catch (err: any) {
      setFormError(err.response?.data?.error ?? 'Failed to create academy');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PlatformAdminNav />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Academies</h1>
          <button
            onClick={() => { setShowModal(true); setFormError(''); setForm(emptyForm()); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Add Academy
          </button>
        </div>

        {toast && (
          <div className="mb-4 px-4 py-3 bg-green-100 border border-green-300 text-green-800 rounded-lg text-sm">
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
                  {['Name', 'Slug', 'Domain', 'Plan', 'Status', 'Owner Email', 'Expires', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {academies.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No academies found</td></tr>
                )}
                {academies.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">{a.slug}</td>
                    <td className="px-4 py-3 text-gray-600">{a.domain}</td>
                    <td className="px-4 py-3 text-gray-600">{a.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.ownerEmail}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(a.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleDisable(a.id)}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium transition-colors"
                          >
                            Disable
                          </button>
                        )}
                        {a.status === 'DISABLED' && (
                          <button
                            onClick={() => handleEnable(a.id)}
                            className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-medium transition-colors"
                          >
                            Enable
                          </button>
                        )}
                        {a.status === 'PENDING' && (
                          <button
                            onClick={() => handleEnable(a.id)}
                            className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-medium transition-colors"
                          >
                            Enable
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(a.id, a.name)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Academy Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Academy</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Slug *" name="slug" value={form.slug} onChange={handleFormChange} placeholder="e.g. rbncc" />
                <Field label="Name *" name="name" value={form.name} onChange={handleFormChange} placeholder="Academy name" />
                <Field label="Domain *" name="domain" value={form.domain} onChange={handleFormChange} placeholder="rbncc.com" />
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Plan *</label>
                  <select
                    name="plan"
                    value={form.plan}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="BASIC">BASIC</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="PREMIUM">PREMIUM</option>
                  </select>
                </div>
                <Field label="Owner Name *" name="ownerName" value={form.ownerName} onChange={handleFormChange} />
                <Field label="Owner Email *" name="ownerEmail" type="email" value={form.ownerEmail} onChange={handleFormChange} />
                <Field label="Owner Phone" name="ownerPhone" value={form.ownerPhone ?? ''} onChange={handleFormChange} />
                <Field label="Server ID (UUID, optional)" name="serverId" value={form.serverId ?? ''} onChange={handleFormChange} placeholder="Optional" />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Database</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="DB Host *" name="dbHost" value={form.dbHost} onChange={handleFormChange} />
                  <Field label="DB Port *" name="dbPort" type="number" value={String(form.dbPort)} onChange={handleFormChange} />
                  <Field label="DB Name *" name="dbName" value={form.dbName} onChange={handleFormChange} />
                  <Field label="DB Username *" name="dbUsername" value={form.dbUsername} onChange={handleFormChange} />
                  <Field label="DB Password *" name="dbPassword" type="password" value={form.dbPassword} onChange={handleFormChange} />
                  <Field label="Expires At (optional)" name="expiresAt" type="datetime-local" value={form.expiresAt ?? ''} onChange={handleFormChange} />
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {formLoading ? 'Creating...' : 'Create Academy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, name, value, onChange, type = 'text', placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  const required = label.endsWith('*');
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
