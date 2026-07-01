import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import platformAdminApi from '../api/platformAdminApi';

export default function PlatformAdminLogin() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('platformAdminKey')) {
      navigate('/platform-admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Temporarily set the key so the interceptor uses it
      localStorage.setItem('platformAdminKey', key);
      await platformAdminApi.get('/dashboard');
      navigate('/platform-admin/dashboard', { replace: true });
    } catch (err: any) {
      localStorage.removeItem('platformAdminKey');
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Invalid API key');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Could not connect to server');
      } else {
        setError('Invalid API key');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-800">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏏</div>
          <h1 className="text-2xl font-bold text-white">CricketMaidan Platform Admin</h1>
          <p className="text-gray-400 text-sm mt-2">Internal use only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
            <input
              type="password"
              placeholder="Enter platform admin key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !key}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
