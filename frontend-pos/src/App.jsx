import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import { EditModal, DeleteModal } from './components/Modals'
import { API_CONFIG, getStatusColor, VENDOR_STATUS_OPTIONS } from './config'

const BACKEND_URL = `${API_CONFIG.BACKEND_URL}/vendors`

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  // ----------------------------------------------------
  // 1. SECURE BY DESIGN (Login & Auth State)
  // ----------------------------------------------------
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('isAuth') === 'true')
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || '') // 'ADMIN' or 'USER'
  const [authData, setAuthData] = useState({ username: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')

    if (!authData.username || !authData.password) {
      setAuthError('Username dan Password tidak boleh kosong!')
      return
    }

    setIsAuthLoading(true)

    try {
      const response = await axios.post(`${API_CONFIG.BACKEND_URL}/auth/login`, authData)
      if (response.status === 200) {
        const role = response.data.role || 'USER'
        setIsAuthenticated(true)
        setUserRole(role)
        localStorage.setItem('isAuth', 'true')
        localStorage.setItem('userRole', role)
        navigate('/vendors')
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Terjadi kesalahan pada server.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUserRole('')
    localStorage.removeItem('isAuth')
    localStorage.removeItem('userRole')
    navigate('/')
  }

  // ----------------------------------------------------
  // VENDOR CRUD STATE
  // ----------------------------------------------------
  const [vendors, setVendors] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  
  const [formData, setFormData] = useState({
    namaPerusahaan: '', alamat: '', kontak: '', statusKerjasama: ''
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [isModalLoading, setIsModalLoading] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // ----------------------------------------------------
  // POS & PAYMENT GATEWAY STATE
  // ----------------------------------------------------
  const [posSelectedVendor, setPosSelectedVendor] = useState('')
  const [posAmount, setPosAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [receipt, setReceipt] = useState(null)

  // ----------------------------------------------------
  // CONTRACT GENERATION STATE
  // ----------------------------------------------------
  const [contractVendor, setContractVendor] = useState('')
  const [contractDuration, setContractDuration] = useState('12') // months
  const [contractValue, setContractValue] = useState('')
  
  // ====================================================
  // CRUD FUNCTIONS
  // ====================================================
  const fetchVendors = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true)
    setError(null)
    try {
      const response = await axios.get(BACKEND_URL, {
        params: { page: currentPage, size: pageSize, sortBy: 'id', sortDir: 'DESC' },
        timeout: API_CONFIG.TIMEOUT
      })
      const { content, totalPages: pages, totalElements: total } = response.data
      setVendors(content)
      setTotalPages(pages)
      setTotalElements(total)
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || 'Gagal memuat data vendor. Pastikan Backend jalan.')
      setVendors([])
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, pageSize, isAuthenticated])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  const validateForm = () => {
    const errors = {}
    if (!formData.namaPerusahaan.trim()) errors.namaPerusahaan = 'Nama tidak boleh kosong'
    if (!formData.alamat.trim()) errors.alamat = 'Alamat tidak boleh kosong'
    if (!formData.kontak.trim()) errors.kontak = 'Kontak tidak boleh kosong'
    if (!formData.statusKerjasama) errors.statusKerjasama = 'Status harus dipilih'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddVendor = async (event) => {
    event.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      await axios.post(BACKEND_URL, formData, { timeout: API_CONFIG.TIMEOUT })
      setSuccessMessage(`Vendor berhasil ditambahkan!`)
      setFormData({ namaPerusahaan: '', alamat: '', kontak: '', statusKerjasama: '' })
      setCurrentPage(0)
      setTimeout(() => setSuccessMessage(null), 4000)
      await fetchVendors()
    } catch (postError) {
      setError(postError.response?.data?.message || 'Gagal menambahkan vendor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateVendor = async (updatedData) => {
    setIsModalLoading(true)
    try {
      await axios.put(`${BACKEND_URL}/${selectedVendor.id}`, updatedData, { timeout: API_CONFIG.TIMEOUT })
      setSuccessMessage(`Vendor berhasil diperbarui!`)
      setEditModalOpen(false)
      setTimeout(() => setSuccessMessage(null), 4000)
      await fetchVendors()
    } catch (updateError) {
      setError('Gagal memperbarui vendor.')
    } finally {
      setIsModalLoading(false)
    }
  }

  const handleDeleteVendor = async (vendorId) => {
    setIsModalLoading(true)
    try {
      await axios.delete(`${BACKEND_URL}/${vendorId}`, { timeout: API_CONFIG.TIMEOUT })
      setSuccessMessage('Vendor berhasil dihapus!')
      setDeleteModalOpen(false)
      setTimeout(() => setSuccessMessage(null), 4000)
      setCurrentPage(0)
      await fetchVendors()
    } catch (deleteError) {
      setError('Gagal menghapus vendor.')
    } finally {
      setIsModalLoading(false)
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }))
  }

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.namaPerusahaan.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || vendor.statusKerjasama === statusFilter
    return matchesSearch && matchesStatus
  })

  // ====================================================
  // POS & PAYMENT SYSTEM FUNCTIONS
  // ====================================================
  const handleProcessPayment = async (e) => {
    e.preventDefault()
    setIsProcessingPayment(true)
    setReceipt(null)
    
    try {
      const payload = { vendorId: posSelectedVendor, amount: posAmount, paymentMethod }
      const response = await axios.post(`${API_CONFIG.BACKEND_URL}/transactions/pay`, payload)
      
      const tx = response.data
      setReceipt({
        transactionId: tx.receiptNumber,
        date: new Date(tx.transactionDate).toLocaleString('id-ID'),
        vendor: tx.vendor.namaPerusahaan,
        amount: tx.amount,
        method: tx.paymentMethod,
        status: tx.status
      })
      setPosAmount('')
      setPaymentMethod('')
    } catch (err) {
      alert("Gagal memproses pembayaran: " + (err.response?.data || "Cek Backend"))
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // ====================================================
  // GENERATE KONTRAK FUNCTIONS (PDF)
  // ====================================================
  const handleGenerateContract = (e) => {
    e.preventDefault()
    const selectedV = vendors.find(v => v.id.toString() === contractVendor)
    if (!selectedV) return

    const doc = new jsPDF()
    
    doc.setFontSize(20)
    doc.text("KONTRAK KERJASAMA VENDOR", 105, 20, null, null, "center")
    
    doc.setFontSize(12)
    doc.text(`Nomor: KTR-${new Date().getFullYear()}/VNDR-${selectedV.id}/001`, 20, 35)
    doc.text(`Tanggal: ${new Date().toLocaleDateString()}`, 20, 42)

    doc.text("Pada hari ini, telah disepakati perjanjian pengadaan barang/jasa antara Perusahaan (Pihak Pertama)", 20, 55)
    doc.text("dengan:", 20, 62)

    doc.setFont("helvetica", "bold")
    doc.text(`Nama Perusahaan : ${selectedV.namaPerusahaan}`, 30, 75)
    doc.text(`Alamat          : ${selectedV.alamat}`, 30, 82)
    doc.text(`Kontak          : ${selectedV.kontak}`, 30, 89)
    doc.setFont("helvetica", "normal")

    doc.text("sebagai Pihak Kedua.", 20, 100)

    doc.text("Detail Kerjasama:", 20, 115)
    doc.text(`1. Durasi Kontrak: ${contractDuration} Bulan`, 30, 125)
    doc.text(`2. Nilai Kontrak : Rp ${Number(contractValue).toLocaleString('id-ID')}`, 30, 132)
    doc.text(`3. Status Awal   : ${selectedV.statusKerjasama}`, 30, 139)

    doc.text("Demikian surat kontrak ini dibuat secara elektronik dan sah menurut", 20, 160)
    doc.text("UU Informasi dan Transaksi Elektronik.", 20, 167)

    doc.text("Pihak Pertama,", 40, 200)
    doc.text("( Direktur Utama )", 40, 230)

    doc.text("Pihak Kedua,", 140, 200)
    doc.text(`( ${selectedV.namaPerusahaan} )`, 140, 230)

    doc.save(`Kontrak_Pengadaan_${selectedV.namaPerusahaan.replace(/\s+/g, '_')}.pdf`)
  }

  // ====================================================
  // COMPONENT RENDERS
  // ====================================================

  const renderLandingPage = () => (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden overflow-y-auto">
      {/* Background Blurs */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/30 blur-[150px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-900/20 blur-[150px] pointer-events-none z-0"></div>
      
      {/* Navbar (Landing) */}
      <nav className="relative z-10 max-w-7xl mx-auto p-6 flex justify-between items-center">
        <div className="font-black text-xl tracking-widest">VENDOR<span className="text-indigo-500">POS</span></div>
        <button onClick={() => navigate('/login')} className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-sm font-bold">
          Login Portal
        </button>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mt-10 mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold tracking-wider text-gray-300">TUGAS BESAR TRANSAKSI ELEKTRONIK</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-500 animate-fade-in" style={{animationDelay: '100ms'}}>
            Secure Vendor Management <br/> & POS Gateway
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-12 font-medium max-w-3xl mx-auto animate-fade-in" style={{animationDelay: '200ms'}}>
            Solusi enterprise terintegrasi untuk mendigitalkan proses manajemen mitra supplier (Vendor), eksekusi pembayaran tagihan secara real-time, hingga pengesahan legalitas kontrak pengadaan.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{animationDelay: '300ms'}}>
            <button onClick={() => navigate('/login')} className="px-8 py-4 rounded-xl bg-white text-black font-extrabold text-lg hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300 flex items-center justify-center gap-3">
              <span>Masuk ke Sistem</span> <span>→</span>
            </button>
            <a href="#features" className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-colors duration-300 flex items-center justify-center">
              Pelajari Fitur
            </a>
          </div>
        </div>
        
        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-32 animate-fade-in" style={{animationDelay: '400ms'}}>
          {[
            { label: "Role Based Access", value: "Tersedia" },
            { label: "Payment Gateway", value: "Terintegrasi" },
            { label: "Database Engine", value: "MySQL" },
            { label: "Architecture", value: "Secure Design" }
          ].map((stat, i) => (
            <div key={i} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-indigo-400 text-sm font-bold uppercase tracking-wider mb-2">{stat.label}</div>
              <div className="text-2xl md:text-3xl font-black text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Feature Details */}
        <div id="features" className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">Informasi Sistem</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Tiga pilar utama yang membangun arsitektur Vendor POS System ini.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-3xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 hover:border-indigo-500/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🛡️</div>
              <h3 className="text-2xl font-bold mb-4">Manajemen Akses & Vendor</h3>
              <p className="text-gray-400 leading-relaxed">
                Sistem dilengkapi autentikasi berlapis yang membedakan <strong>Administrator</strong> (Hak penuh modifikasi data) dan <strong>User</strong> (Kasir Read-Only). Semua data mitra (Supplier) dikelola terpusat di MySQL.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 hover:border-emerald-500/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">💳</div>
              <h3 className="text-2xl font-bold mb-4">Integrasi POS & Payment</h3>
              <p className="text-gray-400 leading-relaxed">
                Dilengkapi dengan antarmuka Point of Sale (POS) untuk melunasi tagihan supplier. Mendukung opsi pembayaran Tunai, Kartu Kredit, hingga E-Wallet, dan tercatat permanen di tabel <strong>Transactions</strong>.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 hover:border-blue-500/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">📄</div>
              <h3 className="text-2xl font-bold mb-4">Otomatisasi Kontrak Legal</h3>
              <p className="text-gray-400 leading-relaxed">
                Sistem mampu mengekstrak data vendor secara dinamis dan men-generate <strong>Dokumen PDF Kontrak Kerjasama</strong> secara otomatis sesuai dengan standar hukum yang berlaku.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center border-t border-white/10 pt-8 text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Vendor POS System. Project Tugas Besar Transaksi Elektronik.</p>
          <p className="mt-1">Dikembangkan menggunakan Spring Boot (Backend) dan React.js (Frontend).</p>
        </footer>
      </main>
    </div>
  )

  const renderLoginPage = () => (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0f] text-white animate-fade-in">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[150px] pointer-events-none"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsLCAyNTUsIDAuMDUpIi8+PC9zdmc+')] opacity-50 pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md p-10 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        
        {/* Header section */}
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2">
            VENDOR GATEWAY
          </h1>
          <p className="text-gray-400 text-sm font-medium tracking-wide">
            Corporate Authentication System
          </p>
        </div>
        
        {authError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 mb-6 text-sm font-semibold rounded-xl flex items-center gap-3 animate-fade-in">
            <span>⚠️</span> {authError}
          </div>
        )}
        
        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Username</label>
            <input 
              autoFocus
              type="text" 
              value={authData.username} 
              onChange={e => setAuthData({...authData, username: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 focus:outline-none transition-all placeholder-gray-600" 
              placeholder="Masukkan username"
            />
          </div>
          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={authData.password} 
              onChange={e => setAuthData({...authData, password: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 focus:outline-none transition-all placeholder-gray-600 pr-12" 
              placeholder="••••••••"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-10 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
          
          <button 
            type="submit" 
            disabled={isAuthLoading} 
            className="w-full mt-4 bg-white text-black font-extrabold py-4 rounded-xl hover:bg-gray-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isAuthLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                MEMVERIFIKASI...
              </>
            ) : 'LOGIN SEKARANG'}
          </button>
        </form>
        
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          End-to-End Encryption Enabled
        </div>
      </div>
    </div>
  )

  const renderVendorPage = () => (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black mb-6 border-b-4 border-black pb-2 inline-block">Manajemen Mitra (Supplier)</h2>
      
      {successMessage && <div className="bg-green-100 border-l-4 border-green-600 text-green-700 p-4 mb-6 font-bold">{successMessage}</div>}
      {error && <div className="bg-red-100 border-l-4 border-red-600 text-red-700 p-4 mb-6 font-bold">{error}</div>}

      {userRole === 'ADMIN' && (
        <div className="bg-white p-6 border-2 border-black shadow-md mb-8">
          <h3 className="text-xl font-bold mb-4">Registrasi Mitra Baru</h3>
          <form onSubmit={handleAddVendor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="namaPerusahaan" value={formData.namaPerusahaan} onChange={handleChange} placeholder="Nama Perusahaan" className="border-2 border-gray-300 p-3 focus:border-black focus:outline-none"/>
            <input type="text" name="alamat" value={formData.alamat} onChange={handleChange} placeholder="Alamat" className="border-2 border-gray-300 p-3 focus:border-black focus:outline-none"/>
            <input type="text" name="kontak" value={formData.kontak} onChange={handleChange} placeholder="Kontak (No HP/Telp)" className="border-2 border-gray-300 p-3 focus:border-black focus:outline-none"/>
            <select name="statusKerjasama" value={formData.statusKerjasama} onChange={handleChange} className="border-2 border-gray-300 p-3 focus:border-black focus:outline-none">
              <option value="">Pilih Status...</option>
              {VENDOR_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <button type="submit" disabled={isSubmitting} className="md:col-span-2 bg-black text-white font-bold py-3 hover:bg-gray-800 transition disabled:opacity-50">TAMBAH DATA</button>
          </form>
        </div>
      )}

      <div className="bg-white border-2 border-black overflow-hidden shadow-md">
        <div className="p-4 bg-gray-100 border-b-2 border-black flex justify-between">
          <input type="text" placeholder="Cari vendor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border-2 border-gray-300 p-2 px-4 focus:border-black focus:outline-none w-64"/>
        </div>
        <table className="w-full text-left">
          <thead className="bg-black text-white">
            <tr>
              <th className="p-4">ID</th><th className="p-4">Nama Perusahaan</th><th className="p-4">Kontak</th><th className="p-4">Status</th>
              {userRole === 'ADMIN' && <th className="p-4">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {filteredVendors.map(vendor => (
              <tr key={vendor.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-4 font-bold">{vendor.id}</td>
                <td className="p-4">{vendor.namaPerusahaan}</td>
                <td className="p-4">{vendor.kontak}</td>
                <td className="p-4"><span className={`px-2 py-1 text-xs font-bold ${getStatusColor(vendor.statusKerjasama)}`}>{vendor.statusKerjasama}</span></td>
                {userRole === 'ADMIN' && (
                  <td className="p-4 flex gap-2">
                    <button onClick={() => { setSelectedVendor(vendor); setEditModalOpen(true); }} className="bg-blue-600 text-white px-3 py-1 text-xs font-bold hover:bg-blue-700">EDIT</button>
                    <button onClick={() => { setSelectedVendor(vendor); setDeleteModalOpen(true); }} className="bg-red-600 text-white px-3 py-1 text-xs font-bold hover:bg-red-700">HAPUS</button>
                  </td>
                )}
              </tr>
            ))}
            {filteredVendors.length === 0 && !isLoading && (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Data vendor tidak ditemukan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderPosPage = () => (
    <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-3xl font-black mb-6 border-b-4 border-black pb-2 inline-block">POS & Payment Gateway</h2>
        
        <div className="bg-white p-6 border-2 border-black shadow-md">
          <form onSubmit={handleProcessPayment} className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2">Pilih Vendor (Biller)</label>
              <select required value={posSelectedVendor} onChange={e => setPosSelectedVendor(e.target.value)} className="w-full border-2 border-gray-300 p-3 focus:border-black focus:outline-none">
                <option value="">-- Pilih Vendor --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.namaPerusahaan}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Total Pembayaran (Rp)</label>
              <input required type="number" value={posAmount} onChange={e => setPosAmount(e.target.value)} placeholder="Misal: 500000" className="w-full border-2 border-gray-300 p-3 focus:border-black focus:outline-none"/>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Metode Pembayaran (Payment Gateway)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`border-2 p-3 text-center cursor-pointer font-bold ${paymentMethod === 'Cash' ? 'border-black bg-gray-100' : 'border-gray-200'}`}>
                  <input required type="radio" className="hidden" name="payment" value="Cash" onChange={e => setPaymentMethod(e.target.value)} />
                  💵 Tunai
                </label>
                <label className={`border-2 p-3 text-center cursor-pointer font-bold ${paymentMethod === 'Card' ? 'border-black bg-gray-100' : 'border-gray-200'}`}>
                  <input required type="radio" className="hidden" name="payment" value="Card" onChange={e => setPaymentMethod(e.target.value)} />
                  💳 Debit/Kredit
                </label>
                <label className={`border-2 p-3 text-center cursor-pointer font-bold ${paymentMethod === 'E-Wallet' ? 'border-black bg-gray-100' : 'border-gray-200'}`}>
                  <input required type="radio" className="hidden" name="payment" value="E-Wallet" onChange={e => setPaymentMethod(e.target.value)} />
                  📱 E-Wallet
                </label>
              </div>
            </div>
            <button type="submit" disabled={isProcessingPayment} className="w-full bg-green-600 text-white font-black py-4 hover:bg-green-700 transition flex justify-center items-center gap-2 text-lg disabled:opacity-70">
              {isProcessingPayment ? 'MENGHUBUNGI GATEWAY...' : '🔒 PROSES PEMBAYARAN AMAN'}
            </button>
          </form>
        </div>
      </div>

      <div>
        {receipt ? (
          <div className="bg-white p-8 border-2 border-dashed border-black shadow-lg">
            <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h3 className="text-2xl font-black">E-RECEIPT</h3>
              <p className="text-sm font-bold text-green-600">TRANSAKSI BERHASIL</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="font-bold text-gray-500">Transaction ID:</span> <span className="font-mono">{receipt.transactionId}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">Date:</span> <span>{receipt.date}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">Vendor:</span> <span className="font-bold">{receipt.vendor}</span></div>
              <div className="flex justify-between"><span className="font-bold text-gray-500">Payment Method:</span> <span>{receipt.method}</span></div>
              <div className="flex justify-between pt-4 border-t border-gray-300 mt-4"><span className="font-black text-lg">TOTAL:</span> <span className="font-black text-lg">Rp {Number(receipt.amount).toLocaleString('id-ID')}</span></div>
            </div>
            <div className="mt-8 text-center text-xs text-gray-400">
              Sistem Pembayaran Diamankan (Secure by Design)
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500 font-bold min-h-[400px]">
            Struk Transaksi akan muncul di sini setelah pembayaran berhasil.
          </div>
        )}
      </div>
    </div>
  )

  const renderContractPage = () => {
    if (userRole !== 'ADMIN') {
      return (
        <div className="animate-fade-in max-w-2xl mx-auto text-center mt-20">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-3xl font-black mb-2">Akses Ditolak</h2>
          <p className="text-gray-600">Halaman Pembuatan Kontrak hanya dapat diakses oleh Administrator.</p>
          <button onClick={() => navigate('/vendors')} className="mt-8 bg-black text-white px-6 py-3 font-bold">Kembali ke Dashboard</button>
        </div>
      )
    }

    return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black mb-2 inline-block">Modul Generate Kontrak</h2>
        <p className="text-gray-600">Buat dokumen PDF kontrak kerjasama resmi secara otomatis.</p>
      </div>
      
      <div className="bg-white p-8 border-2 border-black shadow-md">
        <form onSubmit={handleGenerateContract} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2">Pilih Vendor (Mitra)</label>
            <select required value={contractVendor} onChange={e => setContractVendor(e.target.value)} className="w-full border-2 border-gray-300 p-3 focus:border-black focus:outline-none">
              <option value="">-- Pilih Vendor --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.namaPerusahaan}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Durasi Kontrak (Bulan)</label>
              <input required type="number" value={contractDuration} onChange={e => setContractDuration(e.target.value)} className="w-full border-2 border-gray-300 p-3 focus:border-black focus:outline-none"/>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Nilai Kontrak (Rp)</label>
              <input required type="number" value={contractValue} onChange={e => setContractValue(e.target.value)} placeholder="Contoh: 10000000" className="w-full border-2 border-gray-300 p-3 focus:border-black focus:outline-none"/>
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 hover:bg-blue-700 transition flex justify-center items-center gap-2 text-lg">
            📄 GENERATE & DOWNLOAD PDF
          </button>
        </form>
      </div>
      </div>
    )
  }

  // ====================================================
  // MAIN RENDER (LAYOUT WITH ROUTES)
  // ====================================================
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {isAuthenticated && (
        <nav className="bg-black text-white p-4 shadow-lg sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black">VENDOR POS</h1>
              <p className="text-xs text-gray-400 tracking-widest">SISTEM TRANSAKSI ELEKTRONIK</p>
            </div>
            <div className="flex gap-4 items-center">
              <span className="text-sm font-bold text-gray-400 mr-4 hidden md:block">Halo, {userRole === 'ADMIN' ? 'Admin' : 'User'}</span>
              <Link to="/vendors" className={`px-4 py-2 font-bold rounded transition ${location.pathname === '/vendors' ? 'bg-white text-black' : 'hover:bg-gray-800'}`}>Mitra Supplier</Link>
              <Link to="/pos" className={`px-4 py-2 font-bold rounded transition ${location.pathname === '/pos' ? 'bg-white text-black' : 'hover:bg-gray-800'}`}>POS & Billing</Link>
              {userRole === 'ADMIN' && (
                <Link to="/contract" className={`px-4 py-2 font-bold rounded transition ${location.pathname === '/contract' ? 'bg-white text-black' : 'hover:bg-gray-800'}`}>Legal Kontrak</Link>
              )}
              <button onClick={handleLogout} className="px-4 py-2 font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 ml-4 border border-red-400 rounded transition">Logout</button>
            </div>
          </div>
        </nav>
      )}

      <div className={isAuthenticated ? "max-w-7xl mx-auto p-6 mt-6" : ""}>
        <Routes>
          <Route path="/" element={!isAuthenticated ? renderLandingPage() : <Navigate to="/vendors" />} />
          <Route path="/login" element={!isAuthenticated ? renderLoginPage() : <Navigate to="/vendors" />} />
          <Route path="/vendors" element={isAuthenticated ? renderVendorPage() : <Navigate to="/login" />} />
          <Route path="/pos" element={isAuthenticated ? renderPosPage() : <Navigate to="/login" />} />
          <Route path="/contract" element={isAuthenticated ? renderContractPage() : <Navigate to="/login" />} />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/vendors" : "/"} />} />
        </Routes>
      </div>

      {/* MODALS (Global for Vendor Page) */}
      <EditModal isOpen={editModalOpen} vendor={selectedVendor} onClose={() => setEditModalOpen(false)} onSave={handleUpdateVendor} isLoading={isModalLoading}/>
      <DeleteModal isOpen={deleteModalOpen} vendor={selectedVendor} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDeleteVendor} isLoading={isModalLoading}/>
    </div>
  )
}
