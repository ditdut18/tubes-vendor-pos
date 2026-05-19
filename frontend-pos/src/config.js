// Frontend Environment Configuration
export const API_CONFIG = {
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8081/api',
  TIMEOUT: 10000,
};

export const VENDOR_STATUS_OPTIONS = [
  { value: 'Aktif', label: 'Aktif', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'Pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'Berakhir', label: 'Berakhir', color: 'bg-red-100 text-red-800 border-red-300' },
];

export const getStatusColor = (status) => {
  const found = VENDOR_STATUS_OPTIONS.find(opt => opt.value === status);
  return found ? found.color : 'bg-gray-100 text-gray-800 border-gray-300';
};
