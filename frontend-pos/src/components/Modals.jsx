import { useState } from 'react'

export function EditModal({ isOpen, vendor, onClose, onSave, isLoading }) {
  const [formData, setFormData] = useState(vendor || {
    namaPerusahaan: '',
    alamat: '',
    kontak: '',
    statusKerjasama: ''
  })

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.namaPerusahaan.trim()) newErrors.namaPerusahaan = 'Nama perusahaan tidak boleh kosong'
    if (formData.namaPerusahaan.length < 3) newErrors.namaPerusahaan = 'Minimal 3 karakter'
    if (!formData.alamat.trim()) newErrors.alamat = 'Alamat tidak boleh kosong'
    if (!formData.kontak.trim()) newErrors.kontak = 'Kontak tidak boleh kosong'
    if (!formData.statusKerjasama) newErrors.statusKerjasama = 'Status kerjasama harus dipilih'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-black max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-black text-white px-8 py-6 flex justify-between items-center sticky top-0">
          <h2 className="text-2xl font-black">Edit Vendor</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:opacity-70 transition"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-sm font-bold text-black mb-2">Nama Perusahaan *</label>
            <input
              type="text"
              name="namaPerusahaan"
              value={formData.namaPerusahaan}
              onChange={handleChange}
              className={`w-full bg-white border-2 px-4 py-3 text-base text-black placeholder-gray-500 focus:outline-none focus:bg-black focus:text-white transition ${
                errors.namaPerusahaan ? 'border-red-500' : 'border-black'
              }`}
              placeholder="PT. Kreatif Solusi"
            />
            {errors.namaPerusahaan && (
              <p className="text-red-600 text-xs font-semibold mt-1">{errors.namaPerusahaan}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-2">Alamat *</label>
            <input
              type="text"
              name="alamat"
              value={formData.alamat}
              onChange={handleChange}
              className={`w-full bg-white border-2 px-4 py-3 text-base text-black placeholder-gray-500 focus:outline-none focus:bg-black focus:text-white transition ${
                errors.alamat ? 'border-red-500' : 'border-black'
              }`}
              placeholder="Jl. Merdeka No. 12"
            />
            {errors.alamat && (
              <p className="text-red-600 text-xs font-semibold mt-1">{errors.alamat}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-2">Kontak *</label>
            <input
              type="text"
              name="kontak"
              value={formData.kontak}
              onChange={handleChange}
              className={`w-full bg-white border-2 px-4 py-3 text-base text-black placeholder-gray-500 focus:outline-none focus:bg-black focus:text-white transition ${
                errors.kontak ? 'border-red-500' : 'border-black'
              }`}
              placeholder="08xx-xxxx-xxxx"
            />
            {errors.kontak && (
              <p className="text-red-600 text-xs font-semibold mt-1">{errors.kontak}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-2">Status Kerjasama *</label>
            <select
              name="statusKerjasama"
              value={formData.statusKerjasama}
              onChange={handleChange}
              className={`w-full bg-white border-2 px-4 py-3 text-base text-black focus:outline-none focus:bg-black focus:text-white transition ${
                errors.statusKerjasama ? 'border-red-500' : 'border-black'
              }`}
            >
              <option value="">Pilih Status...</option>
              <option value="Aktif">Aktif</option>
              <option value="Pending">Pending</option>
              <option value="Berakhir">Berakhir</option>
            </select>
            {errors.statusKerjasama && (
              <p className="text-red-600 text-xs font-semibold mt-1">{errors.statusKerjasama}</p>
            )}
          </div>

          <div className="flex gap-4 pt-6 border-t-2 border-black">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border-2 border-black text-black px-6 py-3 text-sm font-bold uppercase tracking-wide hover:bg-gray-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-black border-2 border-black text-white px-6 py-3 text-sm font-bold uppercase tracking-wide hover:bg-gray-900 transition disabled:opacity-50"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function DeleteModal({ isOpen, vendor, onClose, onConfirm, isLoading }) {
  if (!isOpen || !vendor) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-black max-w-sm w-full mx-4">
        <div className="bg-red-600 text-white px-8 py-6 flex justify-between items-center">
          <h2 className="text-2xl font-black">Hapus Vendor</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:opacity-70 transition"
          >
            ×
          </button>
        </div>

        <div className="p-8">
          <p className="text-gray-700 mb-2">Apakah Anda yakin ingin menghapus vendor ini?</p>
          <p className="text-lg font-bold text-black mb-6">
            {vendor.namaPerusahaan}
          </p>

          <p className="text-sm text-gray-600 mb-8 bg-red-50 border-l-4 border-red-600 px-4 py-3">
            ⚠️ Tindakan ini tidak dapat dibatalkan. Data vendor akan dihapus secara permanen.
          </p>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 bg-white border-2 border-black text-black px-6 py-3 text-sm font-bold uppercase tracking-wide hover:bg-gray-100 transition"
            >
              Batal
            </button>
            <button
              onClick={() => onConfirm(vendor.id)}
              disabled={isLoading}
              className="flex-1 bg-red-600 border-2 border-red-600 text-white px-6 py-3 text-sm font-bold uppercase tracking-wide hover:bg-red-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
