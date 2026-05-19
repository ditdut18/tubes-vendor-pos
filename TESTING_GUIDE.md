# 🧪 Feature Testing Guide

Complete testing checklist untuk semua fitur baru Vendor POS v2.0

## ✅ Pre-Test Checklist

- [ ] MySQL database running dengan `db_transaksi_vendor`
- [ ] Backend running di `http://localhost:8081`
- [ ] Frontend running di `http://localhost:5173`
- [ ] Browser console open untuk check errors (F12)
- [ ] Network tab open untuk monitor API calls

---

## 📝 Part 1: Basic CRUD Operations

### 1.1 Create Vendor - Valid Input ✨

**Steps:**
1. Buka aplikasi di `http://localhost:5173`
2. Isi form dengan data:
   - Nama: "PT. Teknologi Indonesia"
   - Alamat: "Jl. Gatot Subroto No. 45, Jakarta"
   - Kontak: "021-123-4567"
   - Status: "Aktif"
3. Click "➕ Tambah Vendor"

**Expected Result:**
- ✅ Form cleared
- ✅ Success message appears: "Vendor 'PT. Teknologi Indonesia' berhasil ditambahkan!"
- ✅ Vendor appears di table
- ✅ Count updated (e.g., "5/5 VENDOR")
- ✅ HTTP 201 status di Network tab

---

### 1.2 Create Vendor - Invalid Input 🚫

**Test Case A: Empty Fields**
1. Coba submit form kosong
2. **Expected**: Error messages untuk setiap field kosong

**Test Case B: Too Short Name**
1. Input nama: "PT" (hanya 2 karakter)
2. **Expected**: Error "Minimal 3 karakter"

**Test Case C: No Status Selected**
1. Isi semua field kecuali status
2. **Expected**: Error "Status kerjasama harus dipilih"

**Test Case D: Too Short Address**
1. Input alamat: "Jl. A" (4 karakter)
2. **Expected**: Error "Minimal 5 karakter"

---

### 1.3 Read Vendors - Display & Pagination 📊

**Test Case A: Table Display**
1. Check table menampilkan semua vendor columns:
   - [ ] ID
   - [ ] Perusahaan
   - [ ] Alamat
   - [ ] Kontak
   - [ ] Status (dengan warna badge)
   - [ ] Aksi (Edit & Hapus buttons)

**Test Case B: Pagination Navigation**
1. Jika ada > 10 vendors, check pagination controls:
   - [ ] "Sebelumnya" button disabled di halaman 1
   - [ ] "Selanjutnya" button disabled di halaman terakhir
   - [ ] Page numbers clickable
   - [ ] Current page highlighted

**Test Case C: Items Per Page Selector**
1. Change dropdown dari "10 per halaman" ke "5 per halaman"
2. **Expected**: Table menampilkan maksimal 5 items
3. Try "20 per halaman"
4. **Expected**: Table menampilkan maksimal 20 items

**Test Case D: Empty State**
1. Jika tidak ada vendor, check:
   - [ ] Pesan: "📭 Tidak ada vendor. Tambahkan vendor baru..."
   - [ ] Table tidak ada row
   - [ ] Pagination tidak terlihat

---

### 1.4 Update Vendor - Edit Modal 📝

**Steps:**
1. Klik button "✎ Edit" pada salah satu row vendor
2. Modal terbuka dengan data vendor terisi
3. Ubah nama vendor: "PT. Teknologi Indonesia" → "PT. Tech Pro"
4. Ubah status: "Aktif" → "Pending"
5. Click "Simpan"

**Expected Result:**
- ✅ Modal close
- ✅ Success message: "Vendor 'PT. Tech Pro' berhasil diperbarui!"
- ✅ Table updated dengan data baru
- ✅ HTTP 200 status di Network tab
- ✅ Updated timestamps di database

**Test Case: Edit Modal Validation**
1. Buka edit modal
2. Clear nama field
3. Try submit
4. **Expected**: Error message "Nama perusahaan tidak boleh kosong"

**Test Case: Cancel Edit**
1. Buka edit modal
2. Change data
3. Click "Batal"
4. **Expected**: Modal close tanpa save, original data tetap

---

### 1.5 Delete Vendor - Confirmation Modal 🗑️

**Steps:**
1. Klik button "🗑 Hapus" pada salah satu row vendor
2. Delete modal terbuka dengan:
   - [ ] Nama vendor ditampilkan
   - [ ] Warning message: "⚠️ Tindakan ini tidak dapat dibatalkan..."
   - [ ] "Batal" button
   - [ ] "Hapus" button (red color)
3. Click "Hapus"

**Expected Result:**
- ✅ Modal close
- ✅ Success message: "Vendor berhasil dihapus!"
- ✅ Vendor disappeared dari table
- ✅ Total vendor count decreased
- ✅ HTTP 200 status di Network tab

**Test Case: Cancel Delete**
1. Buka delete modal
2. Click "Batal"
3. **Expected**: Modal close, vendor tetap di table

---

## 🔍 Part 2: Search & Filter

### 2.1 Search by Name 🔎

**Steps:**
1. Type "PT. Tech" di search field
2. **Expected Result:**
   - ✅ Table filtered hanya menampilkan vendor dengan "PT. Tech" di nama
   - ✅ Vendors yang tidak match tidak tampil
   - ✅ Real-time update saat typing

### 2.2 Search by Contact 📞

**Steps:**
1. Clear search
2. Type nomor kontak vendor: "021"
3. **Expected**: Vendor dengan kontak mengandung "021" terfilter

### 2.3 Search by Address 📍

**Steps:**
1. Type nama alamat: "Jakarta"
2. **Expected**: Vendors dengan alamat mengandung "Jakarta"

### 2.4 Filter by Status 🏷️

**Steps:**
1. Open status dropdown
2. Select "Aktif"
3. **Expected**: Hanya vendor dengan status "Aktif" yang tampil
4. Try "Pending" dan "Berakhir"

### 2.5 Combine Search & Filter

**Steps:**
1. Search: "PT"
2. Filter: "Aktif"
3. **Expected**: Vendors filtered by both search AND status

### 2.6 Reset Filter 🔄

**Steps:**
1. Apply some filters/search
2. Click "Reset Filter"
3. **Expected**: All fields cleared, all vendors displayed

---

## 🎨 Part 3: UI & UX

### 3.1 Status Badge Colors ✨

| Status | Expected Color |
|--------|----------------|
| Aktif | Green badge |
| Pending | Yellow badge |
| Berakhir | Red badge |

Check visual appearance:
- [ ] Colors are distinct
- [ ] Text readable
- [ ] Rounded corners

### 3.2 Loading States ⏳

1. Quick create vendor
2. During API call, button should show "Menambahkan..."
3. During fetch, table should show "⏳ MEMUAT..."
4. **Expected**: Loading indicators visible

### 3.3 Error Messages ❌

1. Try submit invalid form
2. Check error messages are:
   - [ ] Displayed below each field
   - [ ] Red color
   - [ ] Clear and helpful
   - [ ] Disappear when field edited

### 3.4 Success Notifications ✅

1. Perform valid action (create/update/delete)
2. Check notification:
   - [ ] Green background
   - [ ] ✅ Icon
   - [ ] "Sukses" header
   - [ ] Auto-dismiss after 4 seconds

### 3.5 Header & Info Section 📋

Check page elements:
- [ ] Header with emoji 📦
- [ ] Title "Vendor POS" visible
- [ ] Description text
- [ ] Info section at bottom with system details

### 3.6 Responsive Design 📱

1. Resize browser window
2. Check layouts:
   - [ ] Form fields stack properly on mobile
   - [ ] Table remains scrollable
   - [ ] Buttons remain clickable
   - [ ] No text overflow

---

## 🔗 Part 4: API Integration

### 4.1 Network Monitoring 🌐

Open DevTools Network tab:

**Create Vendor:**
- [ ] Method: POST
- [ ] URL: http://localhost:8081/api/vendors
- [ ] Status: 201
- [ ] Request body contains form data
- [ ] Response contains created vendor with ID

**Read Vendors:**
- [ ] Method: GET
- [ ] URL: http://localhost:8081/api/vendors?page=0&size=10...
- [ ] Status: 200
- [ ] Response includes:
  - `content` (array of vendors)
  - `page`, `size`, `totalElements`, `totalPages`

**Update Vendor:**
- [ ] Method: PUT
- [ ] URL: http://localhost:8081/api/vendors/{id}
- [ ] Status: 200
- [ ] Response contains updated vendor

**Delete Vendor:**
- [ ] Method: DELETE
- [ ] URL: http://localhost:8081/api/vendors/{id}
- [ ] Status: 200
- [ ] Response: success message

### 4.2 Error Responses 🚨

**Test Backend Error:**
1. Manually try invalid ID in URL: `/api/vendors/9999`
2. **Expected**:
   - Status: 404
   - Response: ErrorResponse dengan message "Vendor dengan ID 9999 tidak ditemukan"

**Test Validation Error:**
1. Use Postman/curl to POST vendor tanpa namaPerusahaan
2. **Expected**:
   - Status: 400
   - Response: ErrorResponse dengan validation errors list

---

## 📊 Part 5: Data Persistence

### 5.1 Database Check ✅

1. Open MySQL client
2. Run: `SELECT * FROM vendors;`
3. Verify:
   - [ ] All created vendors present
   - [ ] Updated data reflects changes
   - [ ] Deleted vendors not in table
   - [ ] `created_at` dan `updated_at` timestamps present

### 5.2 Refresh Page Test 🔄

1. Create/edit a vendor
2. Refresh browser page (Ctrl+R)
3. **Expected**: Data persists, vendor still visible

### 5.3 Browser Close Test 🚪

1. Create a vendor
2. Close browser completely
3. Reopen and go to application
4. **Expected**: Vendor still there (persistent)

---

## ⚙️ Part 6: Stress Testing

### 6.1 Many Vendors 📈

1. Create 50+ vendors
2. Check:
   - [ ] Pagination works smoothly
   - [ ] Search/filter still responsive
   - [ ] No lag or slowness
   - [ ] Table renders correctly

### 6.2 Long Text Input 📝

1. Try input very long company name (>100 char)
2. **Expected**: Either truncated or error message

### 6.3 Special Characters ✍️

1. Input vendor with: @, #, $, %, &, etc.
2. **Expected**: Should handle or sanitize gracefully

### 6.4 Rapid Clicks 🖱️

1. Rapidly click "Tambah Vendor" button
2. **Expected**: Only one request sent, duplicates prevented

---

## 📋 Summary Checklist

After testing all above, ensure:

- [ ] All CRUD operations work
- [ ] Validation prevents invalid data
- [ ] Search and filter functional
- [ ] UI is responsive and beautiful
- [ ] Error handling works properly
- [ ] Data persists in database
- [ ] Performance is acceptable
- [ ] No console errors

---

## 🎉 Test Result

**Date Tested**: _______________  
**Tested By**: _______________  
**Overall Status**: _____ PASS / _____ FAIL

**Issues Found**:
1. _____________________________________
2. _____________________________________
3. _____________________________________

**Comments**:
_____________________________________________________________
_____________________________________________________________

---

✅ **All tests passed!** Ready for production deployment.
