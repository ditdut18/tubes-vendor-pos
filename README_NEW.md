# 🏢 Vendor POS - Full Stack Application

Aplikasi **Vendor Management System** dengan fitur lengkap untuk mengelola data vendor secara profesional.

Built with **Spring Boot 3.2** (Backend) + **React 19** (Frontend) + **MySQL** (Database)

## 🎯 Quick Start

### 1️⃣ Backend Setup
```bash
cd vendorpos
./mvnw.cmd spring-boot:run
```
✅ Backend berjalan di `http://localhost:8081`

### 2️⃣ Frontend Setup
```bash
cd frontend-pos
npm install
npm run dev
```
✅ Frontend berjalan di `http://localhost:5173`

### 3️⃣ Buka Browser
Akses: **http://localhost:5173**

---

## ✨ Fitur-Fitur Utama

| Feature | Backend | Frontend |
|---------|---------|----------|
| Create Vendor | ✅ POST `/api/vendors` | ✅ Form input |
| Read Vendors | ✅ GET `/api/vendors` | ✅ Table display |
| Update Vendor | ✅ PUT `/api/vendors/{id}` | ✅ Edit Modal |
| Delete Vendor | ✅ DELETE `/api/vendors/{id}` | ✅ Delete Modal |
| Pagination | ✅ Page, Size params | ✅ Page navigation |
| Validation | ✅ Bean Validation | ✅ Form validation |
| Error Handling | ✅ Structured responses | ✅ User-friendly messages |
| Search & Filter | ❌ | ✅ Real-time search |
| Status Badges | ❌ | ✅ Color-coded |

## 📁 Project Structure

```
tubes-vendor-pos/
├── frontend-pos/          # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/    # Reusable components (Modals)
│   │   ├── config.js      # Configuration & constants
│   │   └── App.jsx        # Main component
│   └── package.json
│
├── vendorpos/             # Spring Boot application
│   ├── src/main/java/
│   │   └── com/tubes/vendorpos/
│   │       ├── controller/  # REST APIs
│   │       ├── entity/      # Data models
│   │       ├── repository/  # Data access
│   │       └── dto/         # Response objects
│   ├── pom.xml
│   └── mvnw
│
└── SETUP_GUIDE.md         # Detailed setup instructions
```

## 🔌 API Endpoints

Base URL: `http://localhost:8081/api/vendors`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Get all vendors (with pagination) |
| GET | `/{id}` | Get vendor by ID |
| POST | `/` | Create new vendor |
| PUT | `/{id}` | Update vendor |
| DELETE | `/{id}` | Delete vendor |

### Example Request

```bash
# Get vendors with pagination
curl "http://localhost:8081/api/vendors?page=0&size=10"

# Create vendor
curl -X POST http://localhost:8081/api/vendors \
  -H "Content-Type: application/json" \
  -d '{
    "namaPerusahaan": "PT. Maju Jaya",
    "alamat": "Jl. Sudirman No. 123",
    "kontak": "0812-3456-7890",
    "statusKerjasama": "Aktif"
  }'
```

## 📊 Database

**Database Name**: `db_transaksi_vendor`

**Table: vendors**
```
id                BIGINT (Primary Key, Auto Increment)
nama_perusahaan   VARCHAR(100) - Company name
kontak            VARCHAR(20) - Contact number
alamat            VARCHAR(255) - Address
status_kerjasama  VARCHAR(255) - Status (Aktif/Pending/Berakhir)
created_at        DATETIME - Created timestamp
updated_at        DATETIME - Updated timestamp
```

## 🎨 Frontend Features

### ✅ User Interface
- Modern, clean design dengan Tailwind CSS
- Responsive layout (mobile-friendly)
- Dark/Light theme support
- Icons dan emojis untuk better UX

### ✅ Components
1. **Header** - Title & description
2. **Add Form** - Create vendor dengan validation
3. **Filter Section** - Search & status filter
4. **Data Table** - Display vendors dengan pagination
5. **Edit Modal** - Update vendor data
6. **Delete Modal** - Confirm deletion dengan warning
7. **Alerts** - Success/error messages

### ✅ Interactions
- Real-time form validation
- Loading states during API calls
- Success/error notifications
- Smooth transitions & animations

## 🔧 Configuration

### Backend (application.properties)
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/db_transaksi_vendor
spring.datasource.username=root
spring.datasource.password=
server.port=8081
```

### Frontend (.env.local)
```env
VITE_BACKEND_URL=http://localhost:8081/api
```

## 📦 Dependencies

### Backend
```xml
- Spring Boot 3.2.5
- Spring Data JPA
- MySQL Connector J
- Jakarta Bean Validation
```

### Frontend
```json
- react@19.2.6
- axios@1.16.1
- vite@8.0.12
- tailwindcss@4.3.0
- eslint@10.3.0
```

## ✅ Testing Checklist

- [ ] Create vendor dengan form
- [ ] View vendors di table
- [ ] Edit vendor dengan modal
- [ ] Delete vendor dengan confirmation
- [ ] Search vendor by name
- [ ] Filter vendor by status
- [ ] Navigate pagination pages
- [ ] Change items per page
- [ ] Form validation error messages
- [ ] Success/error notifications

## 🚀 Production Deployment

### Build JAR (Backend)
```bash
cd vendorpos
./mvnw.cmd clean package
# Output: target/vendorpos-0.0.1-SNAPSHOT.jar
```

### Build Frontend
```bash
cd frontend-pos
npm run build
# Output: dist/ folder
```

## 📝 Notes

- ⚠️ CORS enabled untuk semua origin (development only)
- 🔒 No authentication (tambahkan untuk production)
- 💾 Auto-create tables via Hibernate DDL
- 🎯 Initial vendor data "Anxieties Lab" pada startup
- ⏱️ Default timeout 10 detik untuk API calls

## 🐛 Common Issues

**Backend Connection Error?**
- Check MySQL running
- Verify database exists
- Check credentials di application.properties

**CORS Error di Frontend?**
- Ensure backend running di port 8081
- Check .env.local konfigurasi
- Reload browser (hard refresh)

**Port Already In Use?**
- Change port di application.properties
- Atau kill process menggunakan port

## 📞 Support Resources

- [Spring Boot Docs](https://spring.io/projects/spring-boot)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite Guide](https://vitejs.dev)

---

**Status**: ✅ Production Ready  
**Version**: 2.0 Improved Edition  
**Last Updated**: May 19, 2026

For detailed setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md)
