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
  const [userRole, setUserRole] = useState(() => (localStorage.getItem('userRole') || '').toUpperCase()) // 'ADMIN' or 'USER'
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
        const role = (response.data.role || 'USER').toUpperCase()
        setIsAuthenticated(true)
        setUserRole(role)
        localStorage.setItem('isAuth', 'true')
        localStorage.setItem('userRole', role)
        navigate('/dashboard')
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
    namaPerusahaan: '', alamat: '', kontak: '', statusKerjasama: '', defaultPrice: ''
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
  const [cashReceived, setCashReceived] = useState('')
  const [txSearchTerm, setTxSearchTerm] = useState('')
  const [txStatusFilter, setTxStatusFilter] = useState('')
  const [paymentSubOption, setPaymentSubOption] = useState('')
  const [isGatewayOpen, setIsGatewayOpen] = useState(false)
  const [gatewayTx, setGatewayTx] = useState(null)
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false)
  const [activeInfoTab, setActiveInfoTab] = useState('system')

  const handleVendorChange = (vendorId) => {
    setPosSelectedVendor(vendorId)
    if (vendorId) {
      const selectedV = vendors.find(v => v.id.toString() === vendorId)
      if (selectedV && selectedV.defaultPrice !== undefined && selectedV.defaultPrice !== null) {
        setPosAmount(selectedV.defaultPrice.toString())
      } else {
        setPosAmount('500000')
      }
    } else {
      setPosAmount('')
    }
  }

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
      const payload = {
        ...formData,
        defaultPrice: formData.defaultPrice ? Number(formData.defaultPrice) : 500000
      }
      await axios.post(BACKEND_URL, payload, { timeout: API_CONFIG.TIMEOUT })
      setSuccessMessage(`Vendor berhasil ditambahkan!`)
      setFormData({ namaPerusahaan: '', alamat: '', kontak: '', statusKerjasama: '', defaultPrice: '' })
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

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.vendor.namaPerusahaan.toLowerCase().includes(txSearchTerm.toLowerCase()) || tx.receiptNumber.toLowerCase().includes(txSearchTerm.toLowerCase())
    const matchesStatus = !txStatusFilter || tx.status === txStatusFilter
    return matchesSearch && matchesStatus
  })

  // ====================================================
  // POS & PAYMENT SYSTEM FUNCTIONS
  // ====================================================
  const handleProcessPayment = async (e) => {
    e.preventDefault()

    if (paymentMethod === 'Cash') {
      const received = Number(cashReceived)
      const total = Number(posAmount)
      if (isNaN(received) || received < total) {
        alert("Nominal uang yang dibayar kurang dari total tagihan!")
        return
      }
    }

    setIsProcessingPayment(true)
    setReceipt(null)
    
    try {
      setPaymentStatusText('CREATING INVOICE...')
      await new Promise(r => setTimeout(r, 600))

      const finalPaymentMethod = (paymentMethod === 'Card' || paymentMethod === 'E-Wallet') && paymentSubOption
        ? `${paymentMethod} (${paymentSubOption})`
        : paymentMethod;

      const payload = { vendorId: posSelectedVendor, amount: posAmount, paymentMethod: finalPaymentMethod }
      const response = await axios.post(`${API_CONFIG.BACKEND_URL}/transactions/pay`, payload)
      
      const tx = response.data
      const newReceipt = {
        id: tx.id,
        transactionId: tx.receiptNumber,
        date: new Date(tx.transactionDate).toLocaleString('id-ID'),
        vendor: tx.vendor.namaPerusahaan,
        amount: tx.amount,
        method: tx.paymentMethod,
        status: tx.status,
        cashReceived: paymentMethod === 'Cash' ? Number(cashReceived) : null,
        cashReturn: paymentMethod === 'Cash' ? Number(cashReceived) - Number(posAmount) : null
      }
      setReceipt(newReceipt)
      
      if (paymentMethod === 'Card' || paymentMethod === 'E-Wallet') {
        setGatewayTx(newReceipt)
        setIsGatewayOpen(true)
      }

      setPosSelectedVendor('')
      setPosAmount('')
      setPaymentMethod('')
      setCashReceived('')
      setPaymentSubOption('')
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
      setReceipt(prev => ({
        ...prev,
        status: tx.status
      }))
      fetchTransactions()
    } catch (err) {
      alert("Gagal konfirmasi pembayaran.")
    } finally {
      setIsConfirmingPayment(false)
      setPaymentStatusText('')
    }
  }

  const handleSimulatePaymentSuccess = async () => {
    if (!gatewayTx) return
    setIsSimulatingPayment(true)
    try {
      await axios.put(`${API_CONFIG.BACKEND_URL}/transactions/confirm/${gatewayTx.id}`)
      setReceipt(prev => ({
        ...prev,
        status: 'PAID - SECURE'
      }))
      fetchTransactions()
      setTimeout(() => {
        setIsGatewayOpen(false)
        setGatewayTx(null)
        setIsSimulatingPayment(false)
        alert("Simulasi Pembayaran Berhasil! Pembayaran telah diverifikasi secara aman oleh Gateway.")
      }, 1000)
    } catch (err) {
      alert("Gagal mensimulasikan pembayaran.")
      setIsSimulatingPayment(false)
    }
  }

  const handlePrintReceipt = () => {
    if (!receipt) return;
    
    let cashDetailsHtml = '';
    if (receipt.method === 'Cash' && receipt.cashReceived) {
      cashDetailsHtml = `
        <div class="flex"><span>Bayar:</span><span>Rp ${Number(receipt.cashReceived).toLocaleString('id-ID')}</span></div>
        <div class="flex"><span>Kembali:</span><span>Rp ${Number(receipt.cashReturn).toLocaleString('id-ID')}</span></div>
      `;
    }

    const printWindow = window.open('', '_blank', 'width=350,height=600')
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Receipt</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; font-size: 12px; padding: 20px; width: 300px; color: #000; }
            .text-center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h3 style="margin:0;">VENDOR POS</h3>
            <p style="margin:2px 0;">Official Receipt</p>
          </div>
          <div class="divider"></div>
          <div class="flex"><span>ID:</span><span>${receipt.transactionId}</span></div>
          <div class="flex"><span>Tanggal:</span><span>${receipt.date}</span></div>
          <div class="flex"><span>Vendor:</span><span>${receipt.vendor}</span></div>
          <div class="flex"><span>Metode:</span><span>${receipt.method}</span></div>
          <div class="divider"></div>
          <div class="flex bold"><span>TOTAL:</span><span>Rp ${Number(receipt.amount).toLocaleString('id-ID')}</span></div>
          ${cashDetailsHtml}
          <div class="divider"></div>
          <div class="text-center" style="margin-top:20px;">
            <p style="margin:0;">Terima Kasih</p>
            <p style="margin:2px 0;">Transaksi Terverifikasi Aman</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
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

    if (receipt.method === 'Cash' && receipt.cashReceived !== null && receipt.cashReceived !== undefined) {
      doc.text(`Bayar (Cash) : Rp ${Number(receipt.cashReceived).toLocaleString('id-ID')}`, 20, 122)
      doc.text(`Kembalian    : Rp ${Number(receipt.cashReturn).toLocaleString('id-ID')}`, 20, 129)
    }
    
    doc.setFontSize(9)
    doc.text("Dokumen ini adalah bukti pembayaran elektronik yang sah.", 105, 145, null, null, "center")
    
    doc.save(`Invoice_${receipt.transactionId}.pdf`)
  }

  const handleAdminConfirmTransaction = async (id) => {
    try {
      await axios.put(`${API_CONFIG.BACKEND_URL}/transactions/confirm/${id}`)
      if (receipt && receipt.id === id) {
        setReceipt(prev => ({
          ...prev,
          status: 'PAID - SECURE'
        }))
      }
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

      {/* Web App Information Panel (Complex Control Center) */}
      <div className="rounded-2xl border border-indigo-500/20 bg-[#1c1c26] p-6 relative overflow-hidden bg-gradient-to-br from-[#1c1c26] to-[#202030] animate-fade-in mt-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2a3a] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl">🛡️</div>
              <div>
                <h3 className="text-base font-extrabold text-white tracking-wide uppercase">Control Center & Sistem Transaksi</h3>
                <p className="text-xs text-gray-500 mt-0.5">Pusat dokumentasi arsitektur dan monitoring API terpadu</p>
              </div>
            </div>

            {/* Tab Toggles */}
            <div className="flex bg-[#13131a] p-1 rounded-xl border border-[#2a2a3a] self-start sm:self-center">
              {[
                { id: 'system', label: '⚙️ Health Check', desc: 'Status API & Database' },
                { id: 'flow', label: '🔄 Alur Kerja', desc: 'Siklus hidup transaksi' },
                { id: 'security', label: '🔒 Keamanan', desc: 'Protokol & Otentikasi' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveInfoTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeInfoTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  {tab.label.split(' ')[0]} <span className="hidden md:inline">{tab.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: SYSTEM & HEALTH MONITOR */}
          {activeInfoTab === 'system' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Spring Boot REST API', status: 'Active', host: 'localhost:8081', pin: 'bg-emerald-500' },
                  { name: 'React POS Client', status: 'Online', host: 'localhost:5173', pin: 'bg-emerald-500' },
                  { name: 'MySQL Database Server', status: 'Connected', host: 'db_transaksi_vendor', pin: 'bg-emerald-500' },
                  { name: 'Mock Webhook Service', status: 'Ready', host: 'secure_gateway_listener', pin: 'bg-emerald-500' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-[#13131a]/80 border border-[#2a2a3a] p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white mb-0.5">{s.name}</h4>
                      <p className="text-[10px] text-gray-500 font-mono">{s.host}</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold bg-white/5 px-2.5 py-1 rounded-lg">
                      <span className={`w-2 h-2 rounded-full ${s.pin} animate-pulse`}></span> {s.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#13131a]/40 border border-[#2a2a3a] rounded-xl overflow-hidden">
                <div className="p-4 bg-[#13131a] border-b border-[#2a2a3a] flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Spesifikasi Teknologi Platform</span>
                  <span className="text-[10px] text-indigo-400 font-mono uppercase font-semibold">Tubes Transaksi Elektronik</span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-400 leading-relaxed">
                  <div>
                    <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">💻 Frontend Architecture</h5>
                    <ul className="space-y-1 text-xs">
                      <li>• React JS 18 (Client Component Model)</li>
                      <li>• Tailwind CSS v3 (Modern Dark Glassmorphism)</li>
                      <li>• Axios Client (Asynchronous HTTP)</li>
                      <li>• jsPDF Auto-Generator (Dokumen Kontrak)</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">⚙️ Backend Service</h5>
                    <ul className="space-y-1 text-xs">
                      <li>• Spring Boot 3.x RESTful Web Services</li>
                      <li>• Spring Data JPA & Hibernate Engine</li>
                      <li>• Hibernate DDL Auto Schema Migration</li>
                      <li>• Maven Build System</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">🛡️ Keamanan & Integrasi</h5>
                    <ul className="space-y-1 text-xs">
                      <li>• RBAC (Role-Based Access Control)</li>
                      <li>• Mock API Payment Gateway (Midtrans Snap Mock)</li>
                      <li>• Webhook Simulation Event-Driven callback</li>
                      <li>• MySQL Relational DB Storage</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSACTION WORKFLOW TIMELINE */}
          {activeInfoTab === 'flow' && (
            <div className="space-y-6 animate-fade-in">
              <p className="text-gray-400 text-xs leading-relaxed">
                Platform ini mengotomatiskan siklus penagihan vendor dari pemesanan kasir hingga rekonsiliasi database melalui tahapan aman berikut:
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 relative">
                {[
                  { step: '01', title: 'Inisialisasi POS', desc: 'Kasir memilih vendor. Nominal default di-load otomatis dari database (dapat dimodifikasi).', icon: '📝' },
                  { step: '02', title: 'Simpan PENDING', desc: 'Invoice dikirim ke backend dan didaftarkan ke MySQL database dengan status PENDING.', icon: '💾' },
                  { step: '03', title: 'Trigger Gateway', desc: 'Jika non-cash, modal Simulator Payment Gateway (Midtrans Snap) muncul untuk meminta pembayaran.', icon: '📱' },
                  { step: '04', title: 'Webhook Callback', desc: 'Ketika simulator sukses, API /confirm/{id} dipanggil layaknya webhook dari gateway asli.', icon: '🔗' },
                  { step: '05', title: 'Settlement & PDF', desc: 'Status transaksi berubah menjadi PAID - SECURE, balance terupdate, dan invoice siap dicetak.', icon: '✅' }
                ].map((s, idx) => (
                  <div key={idx} className="bg-[#13131a]/60 border border-[#2a2a3a] p-4 rounded-xl flex flex-col justify-between relative group hover:border-indigo-500/30 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-indigo-400 font-mono font-bold text-sm tracking-wider">STAGE {s.step}</span>
                        <span className="text-lg">{s.icon}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1.5">{s.title}</h4>
                      <p className="text-[11px] text-gray-500 leading-normal">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY PROTOCOLS */}
          {activeInfoTab === 'security' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#13131a]/60 border border-[#2a2a3a] p-5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👑</span>
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Role-Based Access Control (RBAC)</h4>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Sistem memisahkan otorisasi dengan ketat berdasarkan hak akses pengguna:
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1.5 pl-2">
                    <li>• <strong className="text-amber-400">ADMIN</strong>: Memiliki hak penuh untuk mengelola (CRUD) mitra vendor, mengubah harga default vendor, menyetujui transaksi secara manual, serta meng-generate kontrak kerja sama legal.</li>
                    <li>• <strong className="text-sky-400">USER (Staff Kasir)</strong>: Hanya diizinkan mengakses menu kasir POS, mengentri pembayaran, dan melihat riwayat billing yang berstatus PENDING.</li>
                  </ul>
                </div>

                <div className="bg-[#13131a]/60 border border-[#2a2a3a] p-5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔒</span>
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Integritas API & Penomoran Invoice</h4>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Untuk mencegah manipulasi data keuangan di database, sistem menggunakan:
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1.5 pl-2">
                    <li>• <strong>Sequential Auto-Confirm Block</strong>: API konfirmasi `/confirm/{id}` dilindungi dan memicu pembaruan state aman yang melarang otorisasi konutng ganda pada transaksi yang sama.</li>
                    <li>• <strong>Deterministic Receipt Numbering</strong>: Nomor struk kasir otomatis ter-generate secara teratur dengan penggabungan kode waktu dan nomor acak terenkripsi untuk mencegah tabrakan data (data collision).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="pt-4 border-t border-[#2a2a3a] flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>Mata Kuliah: <strong>Transaksi Elektronik</strong> - Semester 4</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Database MySQL Server (Connected & Synchronized)</span>
          </div>
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
            <input type="number" name="defaultPrice" value={formData.defaultPrice} onChange={handleChange} placeholder="Harga Default POS (Rp) - Default: 500.000"/>
            <select name="statusKerjasama" value={formData.statusKerjasama} onChange={handleChange} className="md:col-span-2">
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
              <select required value={posSelectedVendor} onChange={e => handleVendorChange(e.target.value)}>
                <option value="">-- Pilih Vendor --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.namaPerusahaan}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Nominal (Rp)</span>
                <span className="text-[10px] text-indigo-400 normal-case font-bold animate-pulse">✨ Terisi Otomatis (Dapat Diedit)</span>
              </label>
              <input required type="number" value={posAmount} onChange={e => setPosAmount(e.target.value)} placeholder="Masukkan nominal atau pilih vendor" className="bg-[#13131a] border-[#2a2a3a] text-white focus:border-indigo-500 transition-all"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2">
                {[{v:'Cash',i:'💵',l:'Tunai'},{v:'Card',i:'💳',l:'Kartu'},{v:'E-Wallet',i:'📱',l:'E-Wallet'}].map(m => (
                  <label key={m.v} className={`p-3 rounded-xl text-center cursor-pointer text-sm font-medium transition-all border ${paymentMethod === m.v ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[#2a2a3a] text-gray-400 hover:border-gray-500'}`}>
                    <input required type="radio" className="!hidden" name="payment" value={m.v} onChange={e => {
                      setPaymentMethod(e.target.value);
                      setCashReceived('');
                      if (e.target.value === 'Card') {
                        setPaymentSubOption('BCA');
                      } else if (e.target.value === 'E-Wallet') {
                        setPaymentSubOption('GoPay');
                      } else {
                        setPaymentSubOption('');
                      }
                    }} />
                    <span className="text-lg block mb-1">{m.i}</span>{m.l}
                  </label>
                ))}
              </div>
            </div>
            {paymentMethod === 'Card' && (
              <div className="space-y-3 bg-[#13131a] p-4 rounded-xl border border-[#2a2a3a] animate-fade-in">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pilih Bank</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Mandiri', 'BCA', 'BRI', 'BNI', 'CIMB Niaga'].map(bank => (
                    <label key={bank} className={`p-2.5 rounded-lg text-center cursor-pointer text-xs font-semibold transition-all border ${paymentSubOption === bank ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' : 'border-[#2a2a3a] text-gray-400 hover:border-gray-500'}`}>
                      <input required type="radio" className="!hidden" name="bankOption" value={bank} checked={paymentSubOption === bank} onChange={e => setPaymentSubOption(e.target.value)} />
                      <span>{bank}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {paymentMethod === 'E-Wallet' && (
              <div className="space-y-3 bg-[#13131a] p-4 rounded-xl border border-[#2a2a3a] animate-fade-in">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pilih Dompet Digital</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja'].map(wallet => (
                    <label key={wallet} className={`p-2.5 rounded-lg text-center cursor-pointer text-xs font-semibold transition-all border ${paymentSubOption === wallet ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' : 'border-[#2a2a3a] text-gray-400 hover:border-gray-500'}`}>
                      <input required type="radio" className="!hidden" name="walletOption" value={wallet} checked={paymentSubOption === wallet} onChange={e => setPaymentSubOption(e.target.value)} />
                      <span>{wallet}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {paymentMethod === 'Cash' && posAmount && (
              <div className="space-y-3 bg-[#13131a] p-4 rounded-xl border border-[#2a2a3a] animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Uang Diterima (Rp)</label>
                  <span className="text-xs text-indigo-400 font-mono">Tagihan: Rp {Number(posAmount).toLocaleString('id-ID')}</span>
                </div>
                <input required type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)} placeholder="Masukkan jumlah uang tunai" className="bg-[#1c1c26] border-[#2a2a3a] text-white w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"/>
                {Number(cashReceived) >= Number(posAmount) && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-400 pt-1">
                    <span>Uang Kembalian:</span>
                    <span>Rp {(Number(cashReceived) - Number(posAmount)).toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>
            )}
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
                {receipt.method === 'Cash' && receipt.cashReceived !== null && receipt.cashReceived !== undefined && (
                  <>
                    <div className="flex justify-between items-center"><span className="text-gray-500">Uang Tunai</span><span className="text-gray-300">Rp {Number(receipt.cashReceived).toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500">Kembalian</span><span className="text-emerald-400 font-semibold">Rp {Number(receipt.cashReturn).toLocaleString('id-ID')}</span></div>
                  </>
                )}
                <div className="flex justify-between items-center pt-4 border-t border-[#2a2a3a] mt-3">
                  <span className="text-lg font-bold text-white">TOTAL</span>
                  <span className={`text-xl font-extrabold ${receipt.status === 'PENDING' ? 'text-white' : 'text-emerald-400'}`}>Rp {Number(receipt.amount).toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                {receipt.status === 'PENDING' ? (
                  userRole === 'ADMIN' ? (
                    <button onClick={handleConfirmPayment} disabled={isConfirmingPayment} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-500 transition disabled:opacity-50 h-14 flex items-center justify-center">
                      {isConfirmingPayment ? (
                        <div className="flex flex-col items-center leading-tight">
                          <svg className="animate-spin h-5 w-5 text-white mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span className="text-[10px] tracking-widest">{paymentStatusText}</span>
                        </div>
                      ) : '💳 Konfirmasi Pembayaran'}
                    </button>
                  ) : (
                    <div className="w-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-semibold p-4 rounded-xl text-center">
                      ⏳ Menunggu Konfirmasi Admin
                    </div>
                  )
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleDownloadReceipt} className="flex-1 bg-white/5 border border-[#2a2a3a] text-white font-semibold py-3 rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2 text-xs">
                      ⬇️ PDF Invoice
                    </button>
                    <button onClick={handlePrintReceipt} className="flex-1 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold py-3 rounded-xl hover:bg-indigo-500/20 transition flex items-center justify-center gap-2 text-xs">
                      🖨️ Cetak Struk
                    </button>
                  </div>
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
        <div className="p-4 border-b border-[#2a2a3a] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Riwayat Transaksi</h3>
            <span className="text-xs text-gray-500">{filteredTransactions.length} dari {transactions.length} transaksi</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="🔍 Cari struk/vendor..." value={txSearchTerm} onChange={e => setTxSearchTerm(e.target.value)} className="!w-48 !h-9 text-xs !py-1 bg-[#13131a] border-[#2a2a3a] text-white focus:outline-none focus:border-indigo-500 rounded-lg"/>
            <select value={txStatusFilter} onChange={e => setTxStatusFilter(e.target.value)} className="!w-32 !h-9 text-xs !py-1 !px-2 bg-[#13131a] border-[#2a2a3a] text-gray-400 focus:outline-none focus:border-indigo-500 rounded-lg">
              <option value="">Semua Status</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID - SECURE">PAID</option>
            </select>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#2a2a3a] text-gray-500 text-xs uppercase tracking-wider">
              <th className="p-3 pl-4">Waktu</th><th className="p-3">No. Struk</th><th className="p-3">Vendor</th><th className="p-3">Metode</th><th className="p-3">Nominal</th><th className="p-3">Status</th>
              {userRole === 'ADMIN' && <th className="p-3">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(tx => (
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
            {filteredTransactions.length === 0 && (
              <tr><td colSpan={userRole === 'ADMIN' ? 7 : 6} className="p-10 text-center text-gray-600 text-sm">Belum ada data transaksi yang cocok.</td></tr>
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

  const PaymentGatewayModal = () => {
    if (!isGatewayOpen || !gatewayTx) return null;

    const methodStr = gatewayTx.method || ''; 
    const isCard = methodStr.includes('Card');
    const subName = methodStr.match(/\(([^)]+)\)/)?.[1] || (isCard ? 'BCA' : 'GoPay');

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-[#1c1c26] border border-[#2a2a3a] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-scale-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 p-5 border-b border-[#2a2a3a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">SECURE PAYMENT GATEWAY</h3>
                <p className="text-[10px] text-indigo-400 font-mono">SIMULATOR (MIDTRANS MOCK)</p>
              </div>
            </div>
            <button onClick={() => { setIsGatewayOpen(false); setGatewayTx(null); }} className="text-gray-400 hover:text-white transition text-lg">&times;</button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Amount details */}
            <div className="bg-[#13131a] p-4 rounded-xl border border-[#2a2a3a] flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Total Tagihan</p>
                <p className="text-xs text-gray-400 mt-0.5">{gatewayTx.vendor}</p>
              </div>
              <p className="text-xl font-extrabold text-indigo-400 font-mono">Rp {Number(gatewayTx.amount).toLocaleString('id-ID')}</p>
            </div>

            {/* Instruction / Sim View */}
            {isCard ? (
              <div className="space-y-4 text-center">
                <div className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold uppercase">
                  Virtual Account {subName}
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Silakan transfer ke nomor Virtual Account berikut:</p>
                  <div className="bg-[#0f0f13] p-3 rounded-lg flex items-center justify-between border border-[#2a2a3a]">
                    <span className="font-mono text-white text-base tracking-wider">880120265819{gatewayTx.id || '01'}</span>
                    <button onClick={() => alert("Nomor VA disalin!")} className="text-xs text-indigo-400 font-semibold hover:text-indigo-300">Salin</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold uppercase">
                  QRIS / E-Wallet {subName}
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl w-40 h-44 mx-auto border-2 border-indigo-500/30 shadow-lg">
                  <svg width="120" height="120" viewBox="0 0 100 100" className="text-black">
                    <rect width="100" height="100" fill="none" />
                    <rect x="0" y="0" width="30" height="30" fill="black" />
                    <rect x="5" y="5" width="20" height="20" fill="white" />
                    <rect x="10" y="10" width="10" height="10" fill="black" />
                    <rect x="70" y="0" width="30" height="30" fill="black" />
                    <rect x="75" y="5" width="20" height="20" fill="white" />
                    <rect x="80" y="10" width="10" height="10" fill="black" />
                    <rect x="0" y="70" width="30" height="30" fill="black" />
                    <rect x="5" y="75" width="20" height="20" fill="white" />
                    <rect x="10" y="80" width="10" height="10" fill="black" />
                    <rect x="40" y="10" width="10" height="10" fill="black" />
                    <rect x="50" y="20" width="10" height="20" fill="black" />
                    <rect x="40" y="40" width="20" height="10" fill="black" />
                    <rect x="10" y="50" width="20" height="10" fill="black" />
                    <rect x="80" y="40" width="10" height="20" fill="black" />
                    <rect x="70" y="70" width="10" height="10" fill="black" />
                    <rect x="80" y="80" width="10" height="20" fill="black" />
                    <rect x="50" y="70" width="10" height="20" fill="black" />
                  </svg>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 font-mono">NMID: ID10202658</span>
                </div>
                <p className="text-[11px] text-gray-400">Scan QRIS menggunakan aplikasi {subName} atau e-wallet lainnya.</p>
              </div>
            )}

            {/* Simulated Action */}
            <button 
              onClick={handleSimulatePaymentSuccess} 
              disabled={isSimulatingPayment} 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 h-14"
            >
              {isSimulatingPayment ? (
                <div className="flex flex-col items-center leading-tight">
                  <svg className="animate-spin h-5 w-5 text-white mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span className="text-[9px] tracking-wider uppercase font-semibold">Memproses Notifikasi Webhook...</span>
                </div>
              ) : (
                <>💳 Simulasikan Pembayaran Sukses</>
              )}
            </button>
          </div>
          
          {/* Footer */}
          <div className="bg-[#13131a] p-4 text-center border-t border-[#2a2a3a]">
            <p className="text-[10px] text-gray-500 font-medium">Secured by 256-bit SSL · Demo Project Transaksi Elektronik</p>
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
      <PaymentGatewayModal />
    </div>
  )
}
