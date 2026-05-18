import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import './App.css'

const BACKEND_URL = 'http://localhost:8081/api/vendors'

function App() {
  // State Management
  const [vendors, setVendors] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('id')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [formData, setFormData] = useState({
    namaPerusahaan: '',
    alamat: '',
    kontak: '',
    statusKerjasama: 'Aktif'
  })

  // Fetch Vendors
  const fetchVendors = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await axios.get(BACKEND_URL)
      setVendors(response.data || [])
    } catch (err) {
      setError('Gagal memuat data vendor. Pastikan Backend sedang berjalan di http://localhost:8081')
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Add/Update Vendor
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.namaPerusahaan || !formData.alamat || !formData.kontak) {
      setError('Semua field harus diisi!')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (editingId) {
        await axios.put(`${BACKEND_URL}/${editingId}`, formData)
        setSuccessMessage(`✅ Vendor "${formData.namaPerusahaan}" berhasil diperbarui!`)
        setEditingId(null)
      } else {
        await axios.post(BACKEND_URL, formData)
        setSuccessMessage(`✅ Vendor "${formData.namaPerusahaan}" berhasil ditambahkan!`)
      }
      setFormData({ namaPerusahaan: '', alamat: '', kontak: '', statusKerjasama: 'Aktif' })
      setShowModal(false)
      setTimeout(() => setSuccessMessage(null), 4000)
      await fetchVendors()
    } catch (err) {
      setError(editingId ? 'Gagal memperbarui vendor. Silakan coba lagi.' : 'Gagal menambahkan vendor. Silakan coba lagi.')
      console.error('Submit error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete Vendor
  const handleDelete = async (id, nama) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await axios.delete(`${BACKEND_URL}/${id}`)
      setSuccessMessage(`✅ Vendor "${nama}" berhasil dihapus!`)
      setDeleteConfirm(null)
      setTimeout(() => setSuccessMessage(null), 4000)
      await fetchVendors()
    } catch (err) {
      setError('Gagal menghapus vendor. Silakan coba lagi.')
      console.error('Delete error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Edit Modal
  const openEditModal = (vendor) => {
    setEditingId(vendor.id)
    setFormData(vendor)
    setShowModal(true)
  }

  // Reset Form
  const resetForm = () => {
    setFormData({ namaPerusahaan: '', alamat: '', kontak: '', statusKerjasama: 'Aktif' })
    setEditingId(null)
    setShowModal(false)
    setError(null)
  }

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Filter and Sort
  const filteredVendors = vendors
    .filter(v =>
      v.namaPerusahaan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.kontak.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.alamat.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'id') return a.id - b.id
      if (sortBy === 'nama') return a.namaPerusahaan.localeCompare(b.namaPerusahaan)
      if (sortBy === 'status') return a.statusKerjasama.localeCompare(b.statusKerjasama)
      return 0
    })

  // Load vendors on mount
  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  // Get status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      'Aktif': { icon: '🟢', color: 'bg-green-100 text-green-700' },
      'Pending': { icon: '🟡', color: 'bg-yellow-100 text-yellow-700' },
      'Berakhir': { icon: '🔴', color: 'bg-red-100 text-red-700' }
    }
    return statusMap[status] || { icon: '⚪', color: 'bg-gray-100 text-gray-700' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">
                📊 Vendor Management System
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                POS Vendor
              </h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 font-medium">Total Vendor</p>
              <p className="text-3xl sm:text-4xl font-bold text-gray-900">{vendors.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert Messages */}
        {error && (
          <article 
            className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-md animate-in fade-in slide-in-from-top"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          </article>
        )}

        {successMessage && (
          <article 
            className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow-md animate-in fade-in slide-in-from-top"
            role="status"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{successMessage.split(' ')[0]}</span>
              <p className="text-sm font-medium text-green-700">{successMessage}</p>
            </div>
          </article>
        )}

        {/* ===== ADD BUTTON SECTION ===== */}
        <section className="mb-8">
          <button
            onClick={() => {
              setShowModal(true)
              setEditingId(null)
              resetForm()
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <span className="text-lg">➕</span>
            <span>Tambah Vendor Baru</span>
          </button>
        </section>

        {/* ===== TABLE SECTION ===== */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <header className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Daftar Vendor</h2>
                <p className="text-blue-100 text-sm mt-1">Kelola semua vendor dengan mudah</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <input
                    type="search"
                    placeholder="🔍 Cari vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-blue-300 bg-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white focus:bg-white focus:text-gray-900 transition"
                    aria-label="Cari vendor"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-blue-300 bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white focus:bg-white focus:text-gray-900 transition"
                  aria-label="Urutkan berdasarkan"
                >
                  <option value="id" className="text-gray-900">📊 Sort: ID</option>
                  <option value="nama" className="text-gray-900">📝 Sort: Nama</option>
                  <option value="status" className="text-gray-900">🎯 Sort: Status</option>
                </select>
              </div>
            </div>
          </header>

          {/* Table Content */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="px-6 py-16 text-center">
                <div className="inline-block">
                  <div className="animate-spin text-4xl mb-4">⏳</div>
                  <p className="text-gray-600 font-medium">Memuat data vendor...</p>
                </div>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-gray-600 font-medium">
                  {searchTerm ? '❌ Tidak ada vendor yang cocok dengan pencarian' : '📌 Tidak ada vendor. Tambahkan vendor baru untuk memulai'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-wider text-xs">ID</th>
                    <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-wider text-xs">Nama Perusahaan</th>
                    <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-wider text-xs">Alamat</th>
                    <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-wider text-xs">Kontak</th>
                    <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-4 font-bold text-gray-900 uppercase tracking-wider text-xs">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-5">
                        <span className="inline-block bg-gray-100 text-gray-900 px-3 py-1 rounded-full font-semibold text-xs">
                          #{vendor.id}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-semibold text-gray-900">{vendor.namaPerusahaan}</p>
                      </td>
                      <td className="px-6 py-5 text-gray-600">{vendor.alamat}</td>
                      <td className="px-6 py-5 text-gray-600">{vendor.kontak}</td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadge(vendor.statusKerjasama).color}`}>
                          {getStatusBadge(vendor.statusKerjasama).icon}
                          {vendor.statusKerjasama}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(vendor)}
                            className="px-3 py-2 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                            title="Edit vendor"
                            aria-label={`Edit ${vendor.namaPerusahaan}`}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(vendor)}
                            className="px-3 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                            title="Hapus vendor"
                            aria-label={`Hapus ${vendor.namaPerusahaan}`}
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer */}
          <footer className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 text-sm text-gray-600">
            <p>
              Menampilkan <span className="font-bold text-gray-900">{filteredVendors.length}</span> dari{' '}
              <span className="font-bold text-gray-900">{vendors.length}</span> vendor
            </p>
            <button
              onClick={fetchVendors}
              disabled={isLoading}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition disabled:opacity-50"
              aria-label="Muat ulang data"
            >
              🔄 Refresh
            </button>
          </footer>
        </section>
      </main>

      {/* ===== MODAL TAMBAH/EDIT ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <dialog
            open
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-in fade-in zoom-in"
          >
            <header className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8">
              <h3 className="text-2xl font-bold text-white">
                {editingId ? '✏️ Edit Vendor' : '➕ Tambah Vendor Baru'}
              </h3>
              <p className="text-blue-100 text-sm mt-2">
                {editingId ? 'Perbarui informasi vendor' : 'Tambahkan vendor baru ke sistem'}
              </p>
            </header>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="namaPerusahaan" className="block text-sm font-bold text-gray-900 mb-2">
                    Nama Perusahaan <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="namaPerusahaan"
                    type="text"
                    name="namaPerusahaan"
                    value={formData.namaPerusahaan}
                    onChange={handleChange}
                    required
                    placeholder="PT. Kreatif Solusi"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="alamat" className="block text-sm font-bold text-gray-900 mb-2">
                    Alamat <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="alamat"
                    type="text"
                    name="alamat"
                    value={formData.alamat}
                    onChange={handleChange}
                    required
                    placeholder="Jl. Merdeka No. 12, Bandung"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="kontak" className="block text-sm font-bold text-gray-900 mb-2">
                    Kontak <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="kontak"
                    type="text"
                    name="kontak"
                    value={formData.kontak}
                    onChange={handleChange}
                    required
                    placeholder="0812-3456-7890 / email@company.com"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="statusKerjasama" className="block text-sm font-bold text-gray-900 mb-2">
                    Status Kerjasama <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="statusKerjasama"
                    name="statusKerjasama"
                    value={formData.statusKerjasama}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white cursor-pointer appearance-none"
                  >
                    <option value="Aktif">🟢 Aktif</option>
                    <option value="Pending">🟡 Pending</option>
                    <option value="Berakhir">🔴 Berakhir</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg font-bold uppercase tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>{isSubmitting ? '⏳' : editingId ? '💾' : '➕'}</span>
                  <span>{isSubmitting ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Tambah'}</span>
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <dialog
            open
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in"
          >
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-2xl font-bold text-gray-900">Hapus Vendor?</h3>
                <p className="text-gray-600 mt-2">
                  Anda yakin ingin menghapus <span className="font-bold">"{deleteConfirm.namaPerusahaan}"</span>?
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-700">
                  ⚠️ Tindakan ini tidak dapat dibatalkan. Data vendor akan dihapus secara permanen.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isSubmitting}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.namaPerusahaan)}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition disabled:opacity-50 flex items-center gap-2"
                >
                  <span>{isSubmitting ? '⏳' : '🗑️'}</span>
                  <span>{isSubmitting ? 'Menghapus...' : 'Hapus'}</span>
                </button>
              </div>
            </div>
          </dialog>
        </div>
      )}
    </div>
  )
}

export default App
