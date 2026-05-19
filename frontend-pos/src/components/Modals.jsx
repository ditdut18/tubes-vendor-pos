import { useState, useEffect } from 'react'

export function EditModal({ isOpen, vendor, onClose, onSave, isLoading }) {
  const [formData, setFormData] = useState({ namaPerusahaan: '', alamat: '', kontak: '', statusKerjasama: '', defaultPrice: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (vendor) setFormData({ 
      namaPerusahaan: vendor.namaPerusahaan, 
      alamat: vendor.alamat, 
      kontak: vendor.kontak, 
      statusKerjasama: vendor.statusKerjasama,
      defaultPrice: vendor.defaultPrice !== undefined && vendor.defaultPrice !== null ? vendor.defaultPrice : '500000'
    })
  }, [vendor])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.namaPerusahaan.trim()) newErrors.namaPerusahaan = 'Wajib diisi'
    if (!formData.alamat.trim()) newErrors.alamat = 'Wajib diisi'
    if (!formData.kontak.trim()) newErrors.kontak = 'Wajib diisi'
    if (!formData.statusKerjasama) newErrors.statusKerjasama = 'Wajib dipilih'
    if (!formData.defaultPrice || isNaN(formData.defaultPrice) || Number(formData.defaultPrice) <= 0) {
      newErrors.defaultPrice = 'Wajib diisi dengan nominal positif'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) onSave(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Data Vendor</h2>
            <p className="text-indigo-200 text-xs mt-0.5">{vendor?.namaPerusahaan}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg transition">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { name: 'namaPerusahaan', label: 'Nama Perusahaan', ph: 'PT. Kreatif Solusi', type: 'text' },
            { name: 'alamat', label: 'Alamat', ph: 'Jl. Merdeka No. 12', type: 'text' },
            { name: 'kontak', label: 'Kontak', ph: '08xx-xxxx-xxxx', type: 'text' },
            { name: 'defaultPrice', label: 'Harga Default POS (Rp)', ph: '500000', type: 'number' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{f.label}</label>
              <input type={f.type || 'text'} name={f.name} value={formData[f.name]} onChange={handleChange} placeholder={f.ph}
                className={errors[f.name] ? '!border-red-500' : ''} />
              {errors[f.name] && <p className="text-red-400 text-xs mt-1">{errors[f.name]}</p>}
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status Kerjasama</label>
            <select name="statusKerjasama" value={formData.statusKerjasama} onChange={handleChange}
              className={errors.statusKerjasama ? '!border-red-500' : ''}>
              <option value="">Pilih Status...</option>
              <option value="Aktif">Aktif</option>
              <option value="Pending">Pending</option>
              <option value="Berakhir">Berakhir</option>
            </select>
            {errors.statusKerjasama && <p className="text-red-400 text-xs mt-1">{errors.statusKerjasama}</p>}
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#2a2a3a]">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#2a2a3a] text-gray-400 font-semibold text-sm hover:bg-[#2a2a3a] transition">Batal</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition disabled:opacity-50">
              {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Hapus Vendor</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg transition">×</button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-xl">⚠️</div>
            <div>
              <p className="text-gray-400 text-sm">Anda akan menghapus:</p>
              <p className="text-white font-bold">{vendor.namaPerusahaan}</p>
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-red-400 text-xs">Tindakan ini tidak dapat dibatalkan. Semua data vendor akan dihapus permanen dari database.</p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#2a2a3a] text-gray-400 font-semibold text-sm hover:bg-[#2a2a3a] transition">Batal</button>
            <button onClick={() => onConfirm(vendor.id)} disabled={isLoading}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-500 transition disabled:opacity-50">
              {isLoading ? 'Menghapus...' : 'Hapus Permanen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
