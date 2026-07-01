import axios from 'axios';

const platformAdminApi = axios.create({
  baseURL: '/api/platform-admin',
});

platformAdminApi.interceptors.request.use((config) => {
  const key = localStorage.getItem('platformAdminKey');
  if (key) {
    config.headers['X-Super-Admin-Key'] = key;
  }
  return config;
});

platformAdminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('platformAdminKey');
      window.location.href = '/platform-admin';
    }
    return Promise.reject(error);
  }
);

export default platformAdminApi;
