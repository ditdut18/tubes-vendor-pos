import { useEffect, useState } from 'react'
import axios from 'axios'

const BACKEND_URL = 'http://localhost:8081/api/vendors'

function App() {
  const [vendors, setVendors] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [formData, setFormData] = useState({
    namaPerusahaan: '',
    alamat: '',
    kontak: '',
    statusKerjasama: ''
  })

  const fetchVendors = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.get(BACKEND_URL)
      setVendors(response.data)
    } catch (fetchError) {
      setError('Gagal memuat data vendor. Periksa kembali koneksi backend.')
    } finally {
      setIsLoading(false)
    }
  }

  const addVendor = async (event) => {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    try {
      await axios.post(BACKEND_URL, {
        namaPerusahaan: formData.namaPerusahaan,
        alamat: formData.alamat,
        kontak: formData.kontak,
        statusKerjasama: formData.statusKerjasama
      })
      setSuccessMessage(`Vendor "${formData.namaPerusahaan}" berhasil ditambahkan!`)
      setFormData({ namaPerusahaan: '', alamat: '', kontak: '', statusKerjasama: '' })
      setTimeout(() => setSuccessMessage(null), 4000)
      await fetchVendors()
    } catch (postError) {
      setError('Gagal menambahkan vendor. Periksa data Anda kembali.')
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  useEffect(() => {
    fetchVendors()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* HEADER */}
        <header className="mb-16">
          <div className="border-b-2 border-black pb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-black mb-2">Anxieties Lab</p>
            <h1 className="text-6xl font-black tracking-tight text-black mb-4">Vendor Management</h1>
            <p className="text-lg text-gray-700 max-w-2xl leading-relaxed">
              Kelola vendor dengan sistem yang solid, bersih, dan profesional. Tambahkan, lihat, dan update semua informasi dalam satu dashboard.
            </p>
          </div>
        </header>

        {/* FORM SECTION */}
        <section className="mb-16">
          <div className="bg-white border-2 border-black p-10">
            <h2 className="text-3xl font-black text-black mb-2">Tambah Vendor Baru</h2>
            <p className="text-sm text-gray-600 mb-8">Isi semua field dengan informasi vendor yang akurat.</p>

            <form onSubmit={addVendor} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Nama Perusahaan *</label>
                  <input
                    type="text"
                    name="namaPerusahaan"
                    value={formData.namaPerusahaan}
                    onChange={handleChange}
                    required
                    placeholder="PT. Kreatif Solusi"
                    className="w-full bg-white border-2 border-black px-4 py-3 text-base text-black placeholder-gray-500 focus:outline-none focus:bg-black focus:text-white transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Alamat *</label>
                  <input
                    type="text"
                    name="alamat"
                    value={formData.alamat}
                    onChange={handleChange}
                    required
                    placeholder="Jl. Merdeka No. 12, Bandung"
                    className="w-full bg-white border-2 border-black px-4 py-3 text-base text-black placeholder-gray-500 focus:outline-none focus:bg-black focus:text-white transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Kontak *</label>
                  <input
                    type="text"
                    name="kontak"
                    value={formData.kontak}
                    onChange={handleChange}
                    required
                    placeholder="0812-3456-7890"
                    className="w-full bg-white border-2 border-black px-4 py-3 text-base text-black placeholder-gray-500 focus:outline-none focus:bg-black focus:text-white transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">Status Kerjasama *</label>
                  <input
                    type="text"
                    name="statusKerjasama"
                    value={formData.statusKerjasama}
                    onChange={handleChange}
                    required
                    placeholder="Aktif / Pending / Selesai"
                    className="w-full bg-white border-2 border-black px-4 py-3 text-base text-black placeholder-gray-500 focus:outline-none focus:bg-black focus:text-white transition"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="bg-black border-2 border-black text-white px-8 py-3 text-sm font-bold uppercase tracking-wide hover:bg-gray-900 transition"
                >
                  Tambah Vendor
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-6 bg-red-50 border-2 border-red-500 p-4">
                <p className="text-red-700 text-sm font-semibold">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mt-6 bg-green-50 border-2 border-green-600 p-4">
                <p className="text-green-700 text-sm font-semibold">{successMessage}</p>
              </div>
            )}
          </div>
        </section>

        {/* TABLE SECTION */}
        <section>
          <div className="border-2 border-black overflow-hidden">
            <div className="bg-black text-white px-10 py-6 flex justify-between items-center">
              <h2 className="text-2xl font-black">Daftar Vendor</h2>
              <span className="text-sm font-bold bg-white text-black px-4 py-1">
                {isLoading ? 'MEMUAT...' : `${vendors.length} VENDOR`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-8 py-4 font-bold uppercase tracking-wider">ID</th>
                    <th className="px-8 py-4 font-bold uppercase tracking-wider">Perusahaan</th>
                    <th className="px-8 py-4 font-bold uppercase tracking-wider">Alamat</th>
                    <th className="px-8 py-4 font-bold uppercase tracking-wider">Kontak</th>
                    <th className="px-8 py-4 font-bold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length === 0 && !isLoading ? (
                    <tr className="bg-white">
                      <td colSpan="5" className="px-8 py-12 text-center text-gray-500 text-sm">
                        Tidak ada vendor. Tambahkan vendor baru untuk melihat data.
                      </td>
                    </tr>
                  ) : (
                    vendors.map((vendor) => (
                      <tr key={vendor.id} className="border-b border-gray-300 hover:bg-gray-50 transition">
                        <td className="px-8 py-5 font-semibold text-black">{vendor.id}</td>
                        <td className="px-8 py-5 font-semibold text-black">{vendor.namaPerusahaan}</td>
                        <td className="px-8 py-5 text-gray-700">{vendor.alamat}</td>
                        <td className="px-8 py-5 text-gray-700">{vendor.kontak}</td>
                        <td className="px-8 py-5">
                          <span className="inline-block bg-black text-white px-4 py-2 text-xs font-black uppercase tracking-wider">
                            {vendor.statusKerjasama}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
