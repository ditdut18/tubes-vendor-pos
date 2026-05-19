import { useEffect, useState, useCallback, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import { EditModal, DeleteModal } from './components/Modals'
import { API_CONFIG, getStatusColor, VENDOR_STATUS_OPTIONS } from './config'

axios.defaults.withCredentials = true
const BACKEND_URL = `${API_CONFIG.BACKEND_URL}/vendors`

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  // ----------------------------------------------------
  // 1. SECURE BY DESIGN (Login & Auth State)
  // ----------------------------------------------------
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') || '')
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('authToken'))
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || '') // 'ADMIN' or 'USER'
  const [authData, setAuthData] = useState({ username: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isRefreshingRef = useRef(false)
  const failedQueueRef = useRef([])

  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [authToken])

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false)
    setUserRole('')
    setAuthToken('')
    localStorage.removeItem('authToken')
    localStorage.removeItem('userRole')
    navigate('/')
  }, [navigate])

  const processQueue = (error, token = null) => {
    failedQueueRef.current.forEach(prom => {
      if (error) {
        prom.reject(error)
      } else {
        prom.resolve(token)
      }
    })
    failedQueueRef.current = []
  }

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await axios.post(`${API_CONFIG.BACKEND_URL}/auth/refresh`)
      const token = response.data.token || ''
      if (token) {
        setAuthToken(token)
        localStorage.setItem('authToken', token)
      }
      return token
    } catch (refreshError) {
      handleLogout()
      throw refreshError
    }
  }, [handleLogout])

  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        if (originalRequest?.url?.includes('/auth/refresh') || originalRequest?.url?.includes('/auth/login')) {
          return Promise.reject(error)
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshingRef.current) {
            return new Promise((resolve, reject) => {
              failedQueueRef.current.push({ resolve, reject })
            }).then((token) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`
              return axios(originalRequest)
            })
          }

          originalRequest._retry = true
          isRefreshingRef.current = true

          return new Promise(async (resolve, reject) => {
            try {
              const newToken = await refreshAccessToken()
              processQueue(null, newToken)
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`
              resolve(await axios(originalRequest))
            } catch (refreshError) {
              processQueue(refreshError, null)
              reject(refreshError)
            } finally {
              isRefreshingRef.current = false
            }
          })
        }

        return Promise.reject(error)
      }
    )

    return () => axios.interceptors.response.eject(responseInterceptor)
  }, [refreshAccessToken])

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
        const token = response.data.token || ''
        setIsAuthenticated(true)
        setUserRole(role)
        setAuthToken(token)
        localStorage.setItem('authToken', token)
        localStorage.setItem('userRole', role)
        navigate('/dashboard')
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Terjadi kesalahan pada server.')
    } finally {
      setIsAuthLoading(false)
    }
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
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  const [paymentStatusText, setPaymentStatusText] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [transactions, setTransactions] = useState([])

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

  const fetchTransactions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(`${API_CONFIG.BACKEND_URL}/transactions`, { timeout: API_CONFIG.TIMEOUT })
      setTransactions(response.data)
    } catch (err) {
      console.error("Gagal load riwayat transaksi", err)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchVendors()
    fetchTransactions()
  }, [fetchVendors, fetchTransactions])

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
      setPaymentStatusText('CREATING INVOICE...')
      await new Promise(r => setTimeout(r, 600))

      const payload = { vendorId: posSelectedVendor, amount: posAmount, paymentMethod }
      const response = await axios.post(`${API_CONFIG.BACKEND_URL}/transactions/pay`, payload)
      
      const tx = response.data
      setReceipt({
        id: tx.id,
        transactionId: tx.receiptNumber,
        date: new Date(tx.transactionDate).toLocaleString('id-ID'),
        vendor: tx.vendor.namaPerusahaan,
        amount: tx.amount,
        method: tx.paymentMethod,
        status: tx.status
      })
      setPosAmount('')
      setPaymentMethod('')
      fetchTransactions()
    } catch (err) {
      alert("Gagal membuat tagihan: " + (err.response?.data || "Cek Backend"))
    } finally {
      setIsProcessingPayment(false)
      setPaymentStatusText('')
    }
  }

  const handleConfirmPayment = async () => {
    if (!receipt || !receipt.id) return;
    setIsConfirmingPayment(true)
    try {
      setPaymentStatusText('INITIALIZING SECURE CONNECTION...')
      await new Promise(r => setTimeout(r, 600))
      
      setPaymentStatusText('VERIFYING VENDOR DATA...')
      await new Promise(r => setTimeout(r, 600))
      
      setPaymentStatusText('AUTHORIZING PAYMENT...')
      await new Promise(r => setTimeout(r, 600))

      setPaymentStatusText('GENERATING E-RECEIPT...')
      
      const response = await axios.put(`${API_CONFIG.BACKEND_URL}/transactions/confirm/${receipt.id}`)
      const tx = response.data
      setReceipt({
        id: tx.id,
        transactionId: tx.receiptNumber,
        date: new Date(tx.transactionDate).toLocaleString('id-ID'),
        vendor: tx.vendor.namaPerusahaan,
        amount: tx.amount,
        method: tx.paymentMethod,
        status: tx.status
      })
      fetchTransactions()
    } catch (err) {
      alert("Gagal konfirmasi pembayaran.")
    } finally {
      setIsConfirmingPayment(false)
      setPaymentStatusText('')
    }
  }

  const handleDownloadReceipt = () => {
    if (!receipt) return;
    const doc = new jsPDF()
    
    doc.setFontSize(22)
    doc.setFont("helvetica", "bold")
    doc.text("VENDOR POS", 105, 20, null, null, "center")
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("Sistem Transaksi Elektronik", 105, 27, null, null, "center")
    doc.text("==================================================", 105, 32, null, null, "center")
    
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("OFFICIAL E-RECEIPT", 105, 45, null, null, "center")
    
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text(`Receipt ID   : ${receipt.transactionId}`, 20, 60)
    doc.text(`Date         : ${receipt.date}`, 20, 67)
    doc.text(`Vendor       : ${receipt.vendor}`, 20, 74)
    doc.text(`Method       : ${receipt.method}`, 20, 81)
    
    doc.text("==================================================", 105, 90, null, null, "center")
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text(`TOTAL PAID   : Rp ${Number(receipt.amount).toLocaleString('id-ID')}`, 20, 105)
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text("Status       : SUCCESS (SECURED)", 20, 115)
    
    doc.setFontSize(9)
    doc.text("Dokumen ini adalah bukti pembayaran elektronik yang sah.", 105, 140, null, null, "center")
    
    doc.save(`Invoice_${receipt.transactionId}.pdf`)
  }

  const handleAdminConfirmTransaction = async (id) => {
    try {
      await axios.put(`${API_CONFIG.BACKEND_URL}/transactions/confirm/${id}`)
      fetchTransactions()
    } catch (err) {
      alert("Gagal mengkonfirmasi transaksi.")
    }
  }

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm("Aksi Administrator: Apakah Anda yakin ingin menghapus data riwayat transaksi ini dari database secara permanen?")) return;
    
    try {
      await axios.delete(`${API_CONFIG.BACKEND_URL}/transactions/${id}`)
      if (receipt && receipt.id === id) setReceipt(null);
      fetchTransactions()
    } catch (err) {
      alert("Gagal menghapus transaksi.")
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

  const renderDashboardPage = () => {
    const totalRevenue = transactions.filter(t => t.status === 'PAID - SECURE').reduce((sum, t) => sum + t.amount, 0)
    const pendingCount = transactions.filter(t => t.status === 'PENDING').length
    const paidCount = transactions.filter(t => t.status === 'PAID - SECURE').length

    return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Selamat datang, {userRole === 'ADMIN' ? 'Administrator' : 'Staff Kasir'}.</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${userRole === 'ADMIN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'}`}>
          {userRole === 'ADMIN' ? '👑 Full Access' : '🔒 Limited Access'}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Vendor', value: vendors.length, icon: '🏢', color: 'from-indigo-600 to-indigo-800', sub: 'Mitra terdaftar' },
          { label: 'Total Transaksi', value: transactions.length, icon: '💳', color: 'from-emerald-600 to-emerald-800', sub: `${paidCount} selesai` },
          { label: 'Menunggu Bayar', value: pendingCount, icon: '⏳', color: 'from-yellow-600 to-amber-800', sub: 'Status pending' },
          { label: 'Total Revenue', value: `Rp ${totalRevenue.toLocaleString('id-ID')}`, icon: '📈', color: 'from-purple-600 to-purple-800', sub: 'Transaksi berhasil' },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] p-5 card-hover" style={{animationDelay: `${i*80}ms`}}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-lg shadow-lg`}>{stat.icon}</div>
            </div>
            <p className="text-2xl font-extrabold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] p-5">
          <h3 className="text-sm font-bold text-white mb-4">Aksi Cepat</h3>
          <div className="space-y-2">
            <Link to="/pos" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-lg group-hover:scale-110 transition">💳</div>
              <div>
                <p className="text-sm font-semibold text-white">Buat Pembayaran</p>
                <p className="text-xs text-gray-500">Proses tagihan vendor</p>
              </div>
            </Link>
            <Link to="/vendors" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-lg group-hover:scale-110 transition">🏢</div>
              <div>
                <p className="text-sm font-semibold text-white">Lihat Vendor</p>
                <p className="text-xs text-gray-500">Kelola data mitra</p>
              </div>
            </Link>
            {userRole === 'ADMIN' && (
              <Link to="/contract" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition group">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-lg group-hover:scale-110 transition">📄</div>
                <div>
                  <p className="text-sm font-semibold text-white">Generate Kontrak</p>
                  <p className="text-xs text-gray-500">Buat kontrak PDF</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] p-5">
          <h3 className="text-sm font-bold text-white mb-4">Transaksi Terbaru</h3>
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0f0f13] border border-[#2a2a3a]">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${tx.status === 'PENDING' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></div>
                    <div>
                      <p className="text-sm font-medium text-white">{tx.vendor.namaPerusahaan}</p>
                      <p className="text-xs text-gray-500">{tx.receiptNumber} · {new Date(tx.transactionDate).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">Rp {Number(tx.amount).toLocaleString('id-ID')}</p>
                    <span className={`text-[10px] font-bold ${tx.status === 'PENDING' ? 'text-yellow-500' : 'text-emerald-500'}`}>{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600 text-sm">Belum ada transaksi.</div>
          )}
        </div>
      </div>
    </div>
    )
  }

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
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Password</label>
            <div className="relative">
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
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
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Manajemen Mitra Vendor</h1>
          <p className="text-gray-500 text-sm mt-0.5">{vendors.length} vendor terdaftar di sistem</p>
        </div>
      </div>

      {successMessage && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium animate-fade-in">✅ {successMessage}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium animate-fade-in">⚠️ {error}</div>}

      {userRole === 'ADMIN' && (
        <div className="rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] p-5">
          <h3 className="text-sm font-bold text-white mb-4">➕ Registrasi Mitra Baru</h3>
          <form onSubmit={handleAddVendor} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" name="namaPerusahaan" value={formData.namaPerusahaan} onChange={handleChange} placeholder="Nama Perusahaan"/>
            <input type="text" name="alamat" value={formData.alamat} onChange={handleChange} placeholder="Alamat"/>
            <input type="text" name="kontak" value={formData.kontak} onChange={handleChange} placeholder="Kontak (No HP/Telp)"/>
            <select name="statusKerjasama" value={formData.statusKerjasama} onChange={handleChange}>
              <option value="">Pilih Status...</option>
              {VENDOR_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <button type="submit" disabled={isSubmitting} className="md:col-span-2 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-500 transition disabled:opacity-50">Tambah Vendor</button>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] overflow-hidden">
        <div className="p-4 border-b border-[#2a2a3a] flex items-center gap-3">
          <input type="text" placeholder="🔍 Cari vendor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="!w-72"/>
          <span className="text-xs text-gray-500 ml-auto">{filteredVendors.length} hasil</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#2a2a3a] text-gray-500 text-xs uppercase tracking-wider">
              <th className="p-4">ID</th><th className="p-4">Nama Perusahaan</th><th className="p-4">Alamat</th><th className="p-4">Kontak</th><th className="p-4">Status</th>
              {userRole === 'ADMIN' && <th className="p-4">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {filteredVendors.map(vendor => (
              <tr key={vendor.id} className="border-b border-[#2a2a3a]/50 hover:bg-white/[0.02] transition">
                <td className="p-4 font-mono text-gray-500 text-xs">#{vendor.id}</td>
                <td className="p-4 font-semibold text-white">{vendor.namaPerusahaan}</td>
                <td className="p-4 text-gray-400 text-xs">{vendor.alamat}</td>
                <td className="p-4 text-gray-400">{vendor.kontak}</td>
                <td className="p-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    vendor.statusKerjasama === 'Aktif' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    vendor.statusKerjasama === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>{vendor.statusKerjasama}</span>
                </td>
                {userRole === 'ADMIN' && (
                  <td className="p-4 flex gap-2">
                    <button onClick={() => { setSelectedVendor(vendor); setEditModalOpen(true); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition">Edit</button>
                    <button onClick={() => { setSelectedVendor(vendor); setDeleteModalOpen(true); }} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition">Hapus</button>
                  </td>
                )}
              </tr>
            ))}
            {filteredVendors.length === 0 && !isLoading && (
              <tr><td colSpan="6" className="p-12 text-center text-gray-600">Data vendor tidak ditemukan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderPosPage = () => (
    <div className="animate-fade-in space-y-6">
      <div><h1 className="text-2xl font-bold text-white">POS & Payment Gateway</h1><p className="text-gray-500 text-sm mt-0.5">Proses pembayaran tagihan vendor</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] p-6">
          <h3 className="text-sm font-bold text-white mb-5">Buat Tagihan Baru</h3>
          <form onSubmit={handleProcessPayment} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Vendor (Biller)</label>
              <select required value={posSelectedVendor} onChange={e => setPosSelectedVendor(e.target.value)}>
                <option value="">-- Pilih Vendor --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.namaPerusahaan}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Nominal (Rp)</label>
              <input required type="number" value={posAmount} onChange={e => setPosAmount(e.target.value)} placeholder="500000"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2">
                {[{v:'Cash',i:'💵',l:'Tunai'},{v:'Card',i:'💳',l:'Kartu'},{v:'E-Wallet',i:'📱',l:'E-Wallet'}].map(m => (
                  <label key={m.v} className={`p-3 rounded-xl text-center cursor-pointer text-sm font-medium transition-all border ${paymentMethod === m.v ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2a3a] text-gray-400 hover:border-gray-500'}`}>
                    <input required type="radio" className="!hidden" name="payment" value={m.v} onChange={e => setPaymentMethod(e.target.value)} />
                    <span className="text-lg block mb-1">{m.i}</span>{m.l}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={isProcessingPayment} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-500 transition disabled:opacity-50 h-14 flex items-center justify-center">
              {isProcessingPayment ? (
                <div className="flex flex-col items-center leading-tight">
                  <svg className="animate-spin h-5 w-5 text-white mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span className="text-[10px] tracking-widest">{paymentStatusText}</span>
                </div>
              ) : '🔒 Proses Pembayaran'}
            </button>
          </form>
        </div>

        <div>
          {receipt ? (
            <div className="rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] p-6 relative">
              {receipt.status === 'PAID - SECURE' && <div className="absolute top-5 right-5 text-emerald-500 text-3xl">✓</div>}
              {receipt.status === 'PENDING' && <div className="absolute top-5 right-5 text-yellow-500 text-2xl animate-pulse">⏳</div>}
              <div className="text-center mb-5 pb-4 border-b border-[#2a2a3a]">
                <h3 className="text-lg font-bold text-white">OFFICIAL E-RECEIPT</h3>
                <p className={`text-xs font-bold mt-1 ${receipt.status === 'PENDING' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                  {receipt.status === 'PENDING' ? 'WAITING FOR PAYMENT' : 'SECURE TRANSACTION VERIFIED'}
                </p>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  ['Transaction ID', <span className="font-mono text-xs bg-[#0f0f13] px-2 py-1 rounded-lg">{receipt.transactionId}</span>],
                  ['Date', receipt.date],
                  ['Vendor', <span className="font-semibold text-white">{receipt.vendor}</span>],
                  ['Method', receipt.method],
                  ['Status', <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${receipt.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{receipt.status}</span>],
                ].map(([k,v],i) => (
                  <div key={i} className="flex justify-between items-center"><span className="text-gray-500">{k}</span>{typeof v === 'string' ? <span className="text-gray-300">{v}</span> : v}</div>
                ))}
                <div className="flex justify-between items-center pt-4 border-t border-[#2a2a3a] mt-3">
                  <span className="text-lg font-bold text-white">TOTAL</span>
                  <span className={`text-xl font-extrabold ${receipt.status === 'PENDING' ? 'text-white' : 'text-emerald-400'}`}>Rp {Number(receipt.amount).toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                {receipt.status === 'PENDING' ? (
                  <button onClick={handleConfirmPayment} disabled={isConfirmingPayment} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-500 transition disabled:opacity-50 h-14 flex items-center justify-center">
                    {isConfirmingPayment ? (
                      <div className="flex flex-col items-center leading-tight">
                        <svg className="animate-spin h-5 w-5 text-white mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="text-[10px] tracking-widest">{paymentStatusText}</span>
                      </div>
                    ) : '💳 Konfirmasi Pembayaran'}
                  </button>
                ) : (
                  <button onClick={handleDownloadReceipt} className="w-full bg-white/5 border border-[#2a2a3a] text-white font-semibold py-3 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2 text-sm">
                    ⬇️ Download Invoice PDF
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center rounded-2xl border border-dashed border-[#2a2a3a] bg-[#1c1c26]/50">
              <div className="text-center text-gray-600"><span className="text-4xl block mb-3 opacity-40">🧾</span><span className="text-sm">Receipt akan muncul<br/>setelah pembayaran dibuat.</span></div>
            </div>
          )}
        </div>
      </div>

      {/* TRANSACTION HISTORY */}
      <div className="rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] overflow-hidden">
        <div className="p-4 border-b border-[#2a2a3a] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Riwayat Transaksi</h3>
          <span className="text-xs text-gray-500">{transactions.length} transaksi</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#2a2a3a] text-gray-500 text-xs uppercase tracking-wider">
              <th className="p-3 pl-4">Waktu</th><th className="p-3">No. Struk</th><th className="p-3">Vendor</th><th className="p-3">Metode</th><th className="p-3">Nominal</th><th className="p-3">Status</th>
              {userRole === 'ADMIN' && <th className="p-3">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="border-b border-[#2a2a3a]/50 hover:bg-white/[0.02] transition">
                <td className="p-3 pl-4 text-gray-400 text-xs">{new Date(tx.transactionDate).toLocaleString('id-ID')}</td>
                <td className="p-3 font-mono text-gray-500 text-xs">{tx.receiptNumber}</td>
                <td className="p-3 font-semibold text-white text-sm">{tx.vendor.namaPerusahaan}</td>
                <td className="p-3 text-gray-400">{tx.paymentMethod}</td>
                <td className="p-3 font-semibold text-emerald-400">Rp {Number(tx.amount).toLocaleString('id-ID')}</td>
                <td className="p-3"><span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${tx.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{tx.status}</span></td>
                {userRole === 'ADMIN' && (
                  <td className="p-3 flex gap-1.5">
                    {tx.status === 'PENDING' && (
                      <button onClick={() => handleAdminConfirmTransaction(tx.id)} className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition">Konfirmasi</button>
                    )}
                    <button onClick={() => handleDeleteTransaction(tx.id)} className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition">Hapus</button>
                  </td>
                )}
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={userRole === 'ADMIN' ? 7 : 6} className="p-10 text-center text-gray-600 text-sm">Belum ada riwayat transaksi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
        
  const renderContractPage = () => {
    if (userRole !== 'ADMIN') {
      return (
        <div className="animate-fade-in max-w-lg mx-auto text-center mt-20">
          <div className="rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] p-10">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-white mb-2">Akses Ditolak</h2>
            <p className="text-gray-500 text-sm mb-6">Halaman ini hanya dapat diakses oleh Administrator.</p>
            <button onClick={() => navigate('/dashboard')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-500 transition">Kembali</button>
          </div>
        </div>
      )
    }

    return (
    <div className="animate-fade-in space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Generate Kontrak Legal</h1><p className="text-gray-500 text-sm mt-0.5">Buat dokumen PDF kontrak kerjasama</p></div>
      
      <div className="max-w-2xl">
        <div className="rounded-2xl border border-[#2a2a3a] bg-[#1c1c26] p-6">
          <form onSubmit={handleGenerateContract} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Pilih Vendor (Mitra)</label>
              <select required value={contractVendor} onChange={e => setContractVendor(e.target.value)}>
                <option value="">-- Pilih Vendor --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.namaPerusahaan}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Durasi (Bulan)</label>
                <input required type="number" value={contractDuration} onChange={e => setContractDuration(e.target.value)}/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Nilai Kontrak (Rp)</label>
                <input required type="number" value={contractValue} onChange={e => setContractValue(e.target.value)} placeholder="10000000"/>
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-500 transition flex items-center justify-center gap-2">
              📄 Generate & Download PDF
            </button>
          </form>
        </div>
      </div>
    </div>
    )
  }

  // ====================================================
  // MAIN RENDER (LAYOUT WITH ROUTES)
  // ====================================================

  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard', adminOnly: false },
    { path: '/vendors', icon: '🏢', label: 'Mitra Vendor', adminOnly: false },
    { path: '/pos', icon: '💳', label: 'POS & Billing', adminOnly: false },
    { path: '/contract', icon: '📄', label: 'Legal Kontrak', adminOnly: true },
  ]

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {isAuthenticated && (
        <div className="flex h-screen overflow-hidden">
          {/* SIDEBAR */}
          <aside className="w-64 bg-[#16161d] border-r border-[#2a2a3a] flex flex-col shrink-0">
            {/* Brand */}
            <div className="p-5 border-b border-[#2a2a3a]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20">VP</div>
                <div>
                  <h1 className="text-base font-extrabold text-white tracking-tight">VENDOR POS</h1>
                  <p className="text-[10px] text-gray-500 tracking-widest">TRANSAKSI ELEKTRONIK</p>
                </div>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 pt-2 pb-2">Menu Utama</p>
              {navItems.filter(item => !item.adminOnly || userRole === 'ADMIN').map(item => (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === item.path
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}>
                  <span className="text-lg">{item.icon}</span> {item.label}
                </Link>
              ))}
            </nav>

            {/* User Info */}
            <div className="p-4 border-t border-[#2a2a3a]">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold ${userRole === 'ADMIN' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-sky-500 to-blue-600'}`}>
                  {userRole === 'ADMIN' ? 'A' : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{userRole === 'ADMIN' ? 'Administrator' : 'Staff Kasir'}</p>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${userRole === 'ADMIN' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'}`}>
                    {userRole}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition">
                Logout
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-7xl mx-auto">
              <Routes>
                <Route path="/dashboard" element={renderDashboardPage()} />
                <Route path="/vendors" element={renderVendorPage()} />
                <Route path="/pos" element={renderPosPage()} />
                <Route path="/contract" element={renderContractPage()} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </div>
          </main>
        </div>
      )}

      {!isAuthenticated && (
        <Routes>
          <Route path="/" element={renderLandingPage()} />
          <Route path="/login" element={renderLoginPage()} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
      <EditModal isOpen={editModalOpen} vendor={selectedVendor} onClose={() => setEditModalOpen(false)} onSave={handleUpdateVendor} isLoading={isModalLoading}/>
      <DeleteModal isOpen={deleteModalOpen} vendor={selectedVendor} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDeleteVendor} isLoading={isModalLoading}/>
    </div>
  )
}
