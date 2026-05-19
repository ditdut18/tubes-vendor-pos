# 📦 Vendor POS - Improved Version

Aplikasi **Vendor Management System** yang dibangun dengan **Spring Boot** (Backend) dan **React + Vite** (Frontend) untuk mengelola data vendor dengan profesional dan efisien.

## ✨ Fitur Utama

### Backend Improvements ✅
- ✅ **Full CRUD Operations** - Create, Read, Update, Delete vendor
- ✅ **Input Validation** - Validasi data di level backend dengan Jakarta Bean Validation
- ✅ **Pagination Support** - Menampilkan data dengan pagination, sortir, dan ukuran halaman yang dapat dikonfigurasi
- ✅ **Error Handling** - Response error yang terstruktur dengan pesan yang jelas
- ✅ **Timestamp Tracking** - Otomatis track waktu pembuatan dan pembaruan data
- ✅ **REST API** - API endpoints yang lengkap dan RESTful
- ✅ **CORS Support** - Mendukung request dari frontend

### Frontend Improvements 🎨
- ✅ **Modern UI Design** - Interface yang bersih, profesional, dan responsif
- ✅ **Edit Modal** - Modal untuk mengedit data vendor
- ✅ **Delete Modal** - Modal konfirmasi sebelum menghapus vendor
- ✅ **Search & Filter** - Pencarian real-time dan filter berdasarkan status
- ✅ **Pagination** - Navigasi halaman dengan tombol next/prev dan page numbers
- ✅ **Form Validation** - Validasi form dengan pesan error yang informatif
- ✅ **Loading States** - Indicator loading untuk operasi async
- ✅ **Responsive Design** - Kompatibel dengan berbagai ukuran layar
- ✅ **Status Badges** - Badge berwarna untuk status vendor (Aktif, Pending, Berakhir)
- ✅ **Environment Config** - Backend URL dapat dikonfigurasi via .env

## 🏗️ Arsitektur Project

```
tubes-vendor-pos/
├── frontend-pos/                    # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── Modals.jsx          # Edit & Delete modal components
│   │   ├── App.jsx                 # Main component dengan full CRUD logic
│   │   ├── config.js               # Configuration & constants
│   │   ├── index.css               # Global styles
│   │   ├── main.jsx                # React entry point
│   │   └── assets/
│   ├── package.json                # Dependencies
│   ├── vite.config.js              # Vite configuration
│   ├── tailwind.config.js          # Tailwind CSS config
│   ├── .env.local                  # Environment variables
│   └── .env.example                # Environment template
│
└── vendorpos/                       # Spring Boot Backend
    ├── src/main/java/com/tubes/vendorpos/
    │   ├── VendorposApplication.java        # Main application
    │   ├── controller/
    │   │   └── VendorController.java        # REST endpoints
    │   ├── entity/
    │   │   └── Vendor.java                  # Data model dengan validasi
    │   ├── repository/
    │   │   └── VendorRepository.java        # Data access layer
    │   └── dto/
    │       ├── ErrorResponse.java           # Error response DTO
    │       └── PaginatedResponse.java       # Pagination response DTO
    ├── src/main/resources/
    │   └── application.properties           # Spring Boot config
    ├── pom.xml                              # Maven dependencies
    └── mvnw, mvnw.cmd                      # Maven wrapper
```

## 🚀 Cara Menjalankan Aplikasi

### Prerequisites
- Java 17+
- Maven (atau gunakan `mvnw`)
- Node.js 16+
- MySQL dengan database `db_transaksi_vendor`

### Langkah 1: Setup Database MySQL

```sql
CREATE DATABASE db_transaksi_vendor;
```

Hibernate akan otomatis membuat tabel `vendors` saat backend pertama kali dijalankan.

### Langkah 2: Jalankan Backend

```bash
cd vendorpos

# Menggunakan Maven wrapper
./mvnw.cmd spring-boot:run

# Atau jika Maven sudah terinstall global
mvn spring-boot:run
```

Backend akan berjalan di `http://localhost:8081`

### Langkah 3: Jalankan Frontend

Buka terminal baru di direktori frontend:

```bash
cd frontend-pos

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

### Langkah 4: Buka Aplikasi

Buka browser dan akses: **http://localhost:5173**

## 📋 API Endpoints

Semua endpoint ada di prefix `/api/vendors`

### 1. Get All Vendors (dengan Pagination)
```
GET /api/vendors?page=0&size=10&sortBy=id&sortDir=DESC

Response:
{
  "content": [...],
  "page": 0,
  "size": 10,
  "totalElements": 15,
  "totalPages": 2,
  "isLast": false
}
```

### 2. Get Vendor by ID
```
GET /api/vendors/{id}

Response: Vendor object atau 404 error
```

### 3. Create Vendor
```
POST /api/vendors

Body:
{
  "namaPerusahaan": "PT. Maju Jaya",
  "alamat": "Jl. Sudirman No. 123",
  "kontak": "0812-3456-7890",
  "statusKerjasama": "Aktif"
}

Response: 201 Created dengan Vendor object
```

### 4. Update Vendor
```
PUT /api/vendors/{id}

Body: Same as Create

Response: 200 OK dengan updated Vendor object
```

### 5. Delete Vendor
```
DELETE /api/vendors/{id}

Response: 200 OK dengan success message
```

## 🔧 Konfigurasi Frontend

Edit file `.env.local` untuk mengubah backend URL:

```env
VITE_BACKEND_URL=http://localhost:8081/api
```

## 📝 Database Schema

```sql
CREATE TABLE vendors (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nama_perusahaan VARCHAR(100) NOT NULL,
  kontak VARCHAR(20) NOT NULL,
  alamat VARCHAR(255) NOT NULL,
  status_kerjasama VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME
);
```

**Field Validations:**
- `namaPerusahaan`: 3-100 karakter, tidak boleh kosong
- `kontak`: 7-20 karakter, tidak boleh kosong
- `alamat`: 5-255 karakter, tidak boleh kosong
- `statusKerjasama`: Harus diisi (Aktif, Pending, Berakhir)

## 🎨 UI Features

### Status Badge Colors
- **Aktif** - Green badge
- **Pending** - Yellow badge
- **Berakhir** - Red badge

### Modal Dialogs
- **Edit Modal** - Form untuk update vendor data
- **Delete Modal** - Konfirmasi dengan warning sebelum delete

### Pagination Controls
- Previous/Next buttons
- Page number buttons
- Items per page selector (5, 10, 20, 50)

### Search & Filter
- Real-time search by company name, contact, or address
- Filter by status
- Reset filter button

## 🧪 Testing Features

### Form Validation
1. Coba buat vendor dengan field kosong → akan tampil error
2. Coba input nama kurang dari 3 karakter → error
3. Isi semua field dengan benar → sukses

### CRUD Operations
1. **Create**: Isi form dan klik "Tambah Vendor"
2. **Read**: Vendor akan tampil di table dengan pagination
3. **Update**: Klik button "✎ Edit" pada row vendor
4. **Delete**: Klik button "🗑 Hapus" dan confirm

### Pagination
1. Navigasi halaman dengan Previous/Next atau page numbers
2. Ubah items per halaman dengan selector
3. Search dan filter akan applied ke halaman saat ini

## 📊 Performance Optimizations

- **Frontend**: Client-side search & filter untuk responsivitas
- **Backend**: Pagination default 10 items per halaman
- **Database**: Indexed primary key dan auto-increment ID
- **API**: Timeout 10 detik untuk request handling

## 🔒 Security Considerations

⚠️ **Development Version**: CORS enabled untuk semua origin
- Untuk production: Batasi CORS hanya untuk domain tertentu
- Tambahkan authentication/authorization
- Validate input di frontend dan backend
- Use HTTPS di production

## 📦 Dependencies

### Backend
- Spring Boot 3.2.5
- Spring Data JPA
- MySQL Connector
- Jakarta Validation API

### Frontend
- React 19.2.6
- Vite 8.0.12
- Axios 1.16.1
- Tailwind CSS 4.3.0
- ESLint 10.3.0

## 🛠️ Build & Deploy

### Build Backend JAR
```bash
cd vendorpos
./mvnw.cmd clean package
# JAR akan ada di target/vendorpos-0.0.1-SNAPSHOT.jar
```

### Build Frontend
```bash
cd frontend-pos
npm run build
# Build output di dist/ folder
```

## 📝 Notes

- Database akan auto-create tabel pertama kali application run
- Initial data vendor "Anxieties Lab" akan diinsert saat startup
- Semua vendor baru akan mendapat unique ID auto-increment
- Timestamp `createdAt` dan `updatedAt` otomatis terisi

## 🐛 Troubleshooting

### Backend Error: Connection refused
- Pastikan MySQL server running
- Cek database name di `application.properties`
- Pastikan koneksi MySQL credential benar

### Frontend Error: CORS issue
- Pastikan backend running di port 8081
- Cek konfigurasi di `.env.local`
- Buka browser console untuk detail error

### Port already in use
```bash
# Kill process di port 8081 (backend)
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Atau ubah port di application.properties
server.port=8082
```

## 📧 Support
Untuk pertanyaan atau issues, cek dokumentasi Spring Boot dan React di official docs.

---

**Version**: 2.0 Improved  
**Last Updated**: May 19, 2026  
**License**: Educational Purpose
