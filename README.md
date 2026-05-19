# Vendor POS & Management System 🏢💳

**Tugas Besar - Mata Kuliah Transaksi Elektronik**  
Dikembangkan oleh: **Alsani & Aditya Luthfi**

Sebuah solusi perangkat lunak *enterprise-grade* untuk mendigitalkan proses manajemen mitra supplier (Vendor), eksekusi pembayaran tagihan secara *real-time* (POS Billing), hingga pengesahan legalitas kontrak pengadaan dengan fokus utama pada arsitektur **Secure by Design**.

---

## ✨ Fitur Utama

1. **Autentikasi Terenkripsi & Role-Based Access Control (RBAC):**
   - **Admin (Procurement Manager):** Memiliki akses penuh (Create, Read, Update, Delete) pada data Master Vendor, serta akses ke menu legalitas kontrak.
   - **User (Staff / Kasir):** Akses *Read-Only* pada data Vendor dan ditugaskan secara khusus untuk melakukan transaksi pembayaran tagihan (POS).
   - Fitur keamanan: Sesi persisten (*Local Storage*), UI State Protection.

2. **Manajemen Mitra (Supplier CRUD):**
   Pencatatan data Vendor/Supplier meliputi Nama Perusahaan, Alamat, Kontak, dan Status Kerjasama (Aktif/Suspend/Berakhir).

3. **Multi-Payment Gateway (POS & Billing):**
   Sistem Point of Sale B2B untuk melunasi tagihan vendor menggunakan multi-metode (Tunai, Debit/Kredit, E-Wallet). Terhubung langsung ke database MySQL (`transactions` table) menghasilkan UUID struk yang aman.

4. **Otomatisasi Kontrak Legal (Auto-Generate PDF):**
   Membuat dokumen Perjanjian Pengadaan Barang/Jasa resmi secara instan dengan ekstrak data dinamis ke dalam format file PDF.

---

## 🛠️ Tech Stack

- **Frontend:** React.js (Vite), Tailwind CSS, React Router, jsPDF, Axios.
- **Backend:** Java Spring Boot, Spring Data JPA, Hibernate.
- **Database:** MySQL.

---

## 🚀 Cara Menjalankan Aplikasi (Setup Guide)

### 1. Persiapan Database
1. Pastikan Anda telah menginstal **XAMPP** atau **MySQL Server**.
2. Jalankan service MySQL.
3. Buat database baru bernama `db_transaksi_vendor`. (Tidak perlu membuat tabel secara manual karena Spring Boot/Hibernate akan melakukan *Auto-DDL*).

### 2. Menjalankan Backend (Spring Boot)
1. Buka Terminal / Command Prompt.
2. Masuk ke direktori backend:
   ```bash
   cd vendorpos
   ```
3. Jalankan aplikasi (pastikan port `8081` tidak digunakan):
   ```bash
   # Untuk Windows
   .\mvnw.cmd spring-boot:run
   
   # Untuk Mac/Linux
   ./mvnw spring-boot:run
   ```
4. *Catatan:* Saat pertama kali dijalankan, **Data Seeder** otomatis menyuntikkan kredensial rahasia ke dalam database.

### 3. Menjalankan Frontend (React.js)
1. Buka Terminal baru.
2. Masuk ke direktori frontend:
   ```bash
   cd frontend-pos
   ```
3. Instal dependencies (jika belum):
   ```bash
   npm install
   ```
4. Jalankan *development server*:
   ```bash
   npm run dev
   ```
5. Buka **http://localhost:5175** di browser Anda.

---

## 🔐 Kredensial Login (Default)

Gunakan kredensial berikut untuk menguji coba fitur sesuai hak aksesnya:

| Role | Username | Password | Keterangan Akses |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `secure123` | Akses penuh (CRUD Vendor, POS, Generate Kontrak). |
| **User Biasa** | `user` | `user123` | Akses kasir (Hanya bisa melihat Vendor dan POS Payment). |

---

> *Project ini dibuat khusus untuk memenuhi kriteria penilaian Tugas Besar Transaksi Elektronik, dengan mendemonstrasikan pertukaran data yang aman, legalitas dokumen elektronik (PDF), serta integritas transaksi keuangan pada database.*
