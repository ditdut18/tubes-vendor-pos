================================================================================
  STRATEGI PENYIMPANAN, PENGAMBILAN, DAN DISTRIBUSI KONTRAK
  Vendor POS & Management System
================================================================================

A. STRUKTUR TABEL CONTRACT (Database MySQL)
============================================

Tabel contracts menyimpan seluruh metadata kontrak dalam satu struktur
relasional dengan foreign key ke tabel users (owner) dan vendors (supplier).

┌─────────────────────────────────────────────────────────────────┐
│  TABEL: contracts                                                │
├────────────────────────────────┬──────────┬──────────────────────┤
│  Kolom                         │  Tipe    │  Keterangan          │
├────────────────────────────────┼──────────┼──────────────────────┤
│  id                            │  BIGINT  │  PK, Auto Increment  │
│  public_id                     │  VARCHAR │  UUID (cegah IDOR)   │
│  contract_number               │  VARCHAR │  KTR2026-01-DK01     │
│  title                         │  VARCHAR │  Judul kontrak       │
│  contract_date                 │  DATE    │  Tanggal kontrak     │
│  first_party_company           │  VARCHAR │  Pihak Pertama       │
│  first_party_address           │  VARCHAR │  Alamat Pihak I      │
│  first_party_pic               │  VARCHAR │  PIC Pihak I         │
│  first_party_position          │  VARCHAR │  Jabatan PIC          │
│  vendor_id                     │  BIGINT  │  FK → vendors(id)    │
│  second_party_company          │  VARCHAR │  Supplier/Distributor │
│  second_party_address          │  VARCHAR │  Alamat Pihak II     │
│  second_party_pic              │  VARCHAR │  PIC Pihak II        │
│  second_party_position         │  VARCHAR │  Jabatan PIC          │
│  second_party_type             │  VARCHAR │  SUPPLIER/DISTRIBUTOR │
│  object_description            │  TEXT    │  Objek kontrak        │
│  scope_of_work                 │  TEXT    │  JSON array           │
│  contract_value                │  DOUBLE  │  Nilai kontrak        │
│  contract_value_text           │  VARCHAR │  Nilai (terbilang)    │
│  currency                      │  VARCHAR │  IDR                  │
│  payment_terms                 │  TEXT    │  JSON array           │
│  rights_obligations_first      │  TEXT    │  JSON                 │
│  rights_obligations_second     │  TEXT    │  JSON                 │
│  confidentiality_clause        │  TEXT    │  Klausul rahasia      │
│  dispute_resolution_clause     │  TEXT    │  Klausul sengketa     │
│  validity_start_date           │  DATE    │  Mulai berlaku        │
│  validity_end_date             │  DATE    │  Akhir berlaku        │
│  validity_duration             │  VARCHAR │  Durasi (teks)        │
│  status                        │  VARCHAR │  DRAFT/ACTIVE/etc     │
│  contract_file_path            │  VARCHAR │  Path file PDF        │
│  contract_file_name            │  VARCHAR │  Nama file PDF        │
│  contract_file_size            │  BIGINT  │  Ukuran file (bytes)  │
│  contract_file_hash            │  VARCHAR │  SHA-256 file         │
│  owner_id                      │  BIGINT  │  FK → users(id)       │
│  updated_by_id                 │  BIGINT  │  FK → users(id)       │
│  created_at                    │  DATETIME│  Timestamp             │
│  updated_at                    │  DATETIME│  Timestamp             │
│  approval_status               │  VARCHAR │  PENDING_APPROVAL/dll │
│  document_version              │  VARCHAR │  Versi dokumen        │
│  document_type                 │  VARCHAR │  Tipe kontrak          │
│  tags                          │  TEXT    │  JSON array            │
│  signature_area                │  TEXT    │  Data tanda tangan     │
└────────────────────────────────┴──────────┴──────────────────────┘

Foreign Keys:
  - owner_id → users(id) — siapa yang memiliki/membuat kontrak
  - vendor_id → vendors(id) — supplier/distributor terkait
  - updated_by_id → users(id) — siapa yang terakhir mengupdate


B. STRATEGI PENGAMBILAN DATA (QUERY FILTERING)
===============================================

Setiap query SELECT contract harus selalu memfilter berdasarkan:

1. JWT User ID (dari token)
2. Role User (ADMIN / USER / SUPPLIER)
3. Ownership Contract (owner_id)

ADMIN — Melihat SEMUA Kontrak
------------------------------
  SELECT c.* FROM contracts c 
  ORDER BY c.created_at DESC;
  
  → Tidak ada filter. Admin memiliki akses penuh ke seluruh kontrak.

USER — Hanya Kontrak Miliknya
------------------------------
  SELECT c.* FROM contracts c 
  WHERE c.owner_id = :currentUserId 
  ORDER BY c.created_at DESC;
  
  → Filter berdasarkan owner_id. User hanya melihat kontrak yang dibuatnya.

SUPPLIER / DISTRIBUTOR — Hanya Kontrak Terkait
-----------------------------------------------
  SELECT c.* FROM contracts c 
  WHERE c.vendor_id = :vendorId 
     OR c.second_party_company LIKE %:companyName%
  ORDER BY c.created_at DESC;
  
  → Filter berdasarkan vendor_id atau nama perusahaan supplier.


C. DIAGRAM ALUR DISTRIBUSI PDF KONTRAK
========================================

┌──────────────────────────────────────────────────────────────────────────┐
│                    DISTRIBUSI DOKUMEN KONTRAK                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   DATABASE                                                                │
│   (Simpan Metadata Kontrak)                                               │
│        │                                                                  │
│        ▼                                                                  │
│   GENERATE PDF                                                            │
│   (ContractPdfGeneratorService — iText/PDFBox atau jsPDF)                  │
│        │                                                                  │
│        ▼                                                                  │
│   SIMPAN FILE PDF                                                         │
│   (Path: uploads/contracts/KTR2026-XX-DKXX.pdf)                           │
│        │                                                                  │
│        ▼                                                                  │
│   SIMPAN METADATA                                                         │
│   (file_path, file_name, file_size, file_hash di tabel contracts)          │
│        │                                                                  │
│        ▼                                                                  │
│   VALIDASI JWT                                                            │
│   (JwtAuthenticationFilter — cek token di header Authorization)           │
│        │                                                                  │
│        ▼                                                                  │
│   VALIDASI RBAC                                                           │
│   (@PreAuthorize — cek role user)                                         │
│        │                                                                  │
│        ▼                                                                  │
│   VALIDASI OWNERSHIP                                                      │
│   (ContractService.validateAccess() — cek owner_id / vendor_id)           │
│        │                                                                  │
│        ▼                                                                  │
│   DOWNLOAD PDF                                                            │
│   (GET /api/contracts/{publicId}/download → FileSystemResource)           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘


D. PENCEGAHAN KEBOCORAN DATA
=============================

1. Mencegah IDOR (Insecure Direct Object Reference)
----------------------------------------------------
   - Gunakan UUID (public_id) untuk akses kontrak, BUKAN id numerik.
   - Contoh: GET /api/contracts/550e8400-e29b-41d4-a716-446655440000
     BUKAN: GET /api/contracts/7
   - Validasi ownership di service layer SEBELUM mengembalikan data.

2. Mencegah Unauthorized Access
--------------------------------
   - Lapisan 1: JWT Authentication (JwtAuthenticationFilter)
   - Lapisan 2: Endpoint Security (SecurityConfig — URL pattern)
   - Lapisan 3: Method Security (@PreAuthorize)
   - Lapisan 4: Ownership Validation (ContractService.validateAccess())

3. Mencegah Data Leakage
-------------------------
   - Tidak menampilkan field sensitif di response API
   - File PDF hanya bisa di-download via endpoint yang sudah divalidasi
   - Tidak ada akses langsung ke direktori file (path tidak di-expose)
   - Hash SHA-256 untuk verifikasi integritas file PDF
   - Logging akses untuk audit trail

4. Mencegah Direct File Access
-------------------------------
   - File PDF disimpan di direktori yang TIDAK bisa diakses publik
   - Akses file hanya melalui endpoint /api/contracts/{id}/download
   - Spring Boot static resource configuration TIDAK meng-expose direktori
   - Validasi JWT + RBAC + Ownership sebelum file di-serve

Contoh Konfigurasi (application.properties):
  # Path penyimpanan file kontrak (di luar static resources)
  contract.storage.path=uploads/contracts/
  
  # Tidak ada static resource untuk file uploads
  # (mencegah direct file access via browser)
  spring.web.resources.static-locations=classpath:/static/


E. DIAGRAM OWNERSHIP & AKSES
==============================

┌─────────────────────────────────────────────────────────────────────┐
│                    MODEL KEPEMILIKAN KONTRAK                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   TABEL: users                                                      │
│   ┌──────────┐       ┌──────────────────┐                           │
│   │  ADMIN   │──────▶│  SEMUA Kontrak   │  (no filter)              │
│   └──────────┘       └──────────────────┘                           │
│                                                                     │
│   ┌──────────┐       ┌──────────────────┐                           │
│   │  USER    │──────▶│  Kontrak sendiri  │  (WHERE owner_id = ?)    │
│   └──────────┘       └──────────────────┘                           │
│                                                                     │
│   ┌──────────────┐   ┌──────────────────┐                           │
│   │  SUPPLIER/   │──▶│  Kontrak vendor  │  (WHERE vendor_id = ?)   │
│   │  DISTRIBUTOR │   └──────────────────┘                           │
│   └──────────────┘                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘


F. CONTOH IMPLEMENTASI ENDPOINT
=================================

GET /api/contracts
  Headers: Authorization: Bearer <JWT_TOKEN>
  Response (Admin):  → Semua kontrak (paginated)
  Response (User):   → Hanya kontrak dengan owner_id = user.id

GET /api/contracts/{publicId}
  Headers: Authorization: Bearer <JWT_TOKEN>
  Jika bukan owner & bukan admin → 403 FORBIDDEN

GET /api/contracts/{publicId}/download
  Headers: Authorization: Bearer <JWT_TOKEN>
  Jika valid → File PDF di-stream ke client
  Jika invalid → 403 FORBIDDEN


G. VERIFIKASI INTEGRITAS FILE PDF
====================================

Setiap file PDF kontrak memiliki hash SHA-256 yang disimpan di database.
Verifikasi dapat dilakukan dengan:

  # Di sisi client setelah download:
  certutil -hashfile KTR2026-01-DK01.pdf SHA256
  
  # Bandingkan dengan hash di response API:
  GET /api/contracts/{publicId}
  → Response.contractFileHash = "abc123..."
  
Jika hash tidak cocok, file telah dimodifikasi/dirusak.
