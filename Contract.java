package com.tubes.vendorpos.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * ENTITY KONTRAK — Relasi Bisnis Pihak Pertama & Pihak Kedua
 * 
 * Tabel: contracts
 * Relasi: 
 *   - ManyToOne ke User (owner_id) — siapa yang membuat kontrak
 *   - ManyToOne ke Vendor (vendor_id) — supplier/distributor terkait
 * 
 * Ownership:
 *   - ADMIN dapat melihat SEMUA kontrak
 *   - USER hanya dapat melihat kontrak yang dibuatnya (owner_id = user.id)
 *   - SUPPLIER/DISTRIBUTOR hanya melihat kontrak yang terkait vendor-nya
 */
@Entity
@Table(name = "contracts")
public class Contract {

    // ================================================================
    // PRIMARY KEY
    // ================================================================
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 
     * UUID publik untuk mencegah IDOR via enumerasi ID sekuensial.
     * Digunakan di API endpoints, bukan id numerik.
     */
    @Column(nullable = false, unique = true, length = 36)
    private String publicId; // UUID.randomUUID().toString()

    // ================================================================
    // NOMOR KONTRAK — Format: KTR2026-XX-DKXX
    // ================================================================
    @NotBlank(message = "Nomor kontrak tidak boleh kosong")
    @Column(nullable = false, unique = true, length = 50)
    private String contractNumber;

    @NotBlank(message = "Judul kontrak tidak boleh kosong")
    @Size(min = 5, max = 200, message = "Judul kontrak 5-200 karakter")
    @Column(nullable = false, length = 200)
    private String title;

    @NotNull(message = "Tanggal kontrak tidak boleh kosong")
    @Column(nullable = false)
    private LocalDate contractDate;

    // ================================================================
    // IDENTITAS PIHAK PERTAMA (PEMBELI/PERUSAHAAN)
    // ================================================================
    @NotBlank(message = "Nama perusahaan pihak pertama wajib diisi")
    @Column(nullable = false, length = 150)
    private String firstPartyCompany;

    @NotBlank(message = "Alamat pihak pertama wajib diisi")
    @Column(nullable = false, length = 500)
    private String firstPartyAddress;

    @NotBlank(message = "PIC pihak pertama wajib diisi")
    @Column(nullable = false, length = 100)
    private String firstPartyPic;

    @NotBlank(message = "Jabatan PIC pihak pertama wajib diisi")
    @Column(nullable = false, length = 100)
    private String firstPartyPosition;

    // ================================================================
    // IDENTITAS PIHAK KEDUA (SUPPLIER/DISTRIBUTOR)
    // ================================================================

    /** Relasi ke tabel vendors (opsional jika supplier belum terdaftar) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = true)
    private Vendor vendor;

    @NotBlank(message = "Nama supplier pihak kedua wajib diisi")
    @Column(nullable = false, length = 150)
    private String secondPartyCompany;

    @Column(nullable = false, length = 500)
    private String secondPartyAddress;

    @Column(nullable = false, length = 100)
    private String secondPartyPic;

    @Column(nullable = false, length = 100)
    private String secondPartyPosition;

    /** Tipe supplier: SUPPLIER / DISTRIBUTOR */
    @Column(nullable = false, length = 20)
    private String secondPartyType = "SUPPLIER";

    // ================================================================
    // OBJEK DAN RUANG LINGKUP KONTRAK
    // ================================================================
    @NotBlank(message = "Objek kontrak wajib diisi")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String objectDescription;

    /** Ruang lingkup kerja — disimpan sebagai JSON array string */
    @Column(columnDefinition = "TEXT")
    private String scopeOfWork; // JSON array

    // ================================================================
    // NILAI KONTRAK DAN PEMBAYARAN
    // ================================================================
    @NotNull(message = "Nilai kontrak wajib diisi")
    @Min(value = 1, message = "Nilai kontrak minimal 1")
    @Column(nullable = false)
    private Double contractValue;

    @Column(length = 250)
    private String contractValueText;

    @Column(length = 10)
    private String currency = "IDR";

    /** Termin pembayaran — disimpan sebagai JSON */
    @Column(columnDefinition = "TEXT")
    private String paymentTerms; // JSON array of payment terms

    // ================================================================
    // HAK DAN KEWAJIBAN — disimpan sebagai JSON
    // ================================================================
    @Column(columnDefinition = "TEXT")
    private String rightsAndObligationsFirstParty; // JSON

    @Column(columnDefinition = "TEXT")
    private String rightsAndObligationsSecondParty; // JSON

    // ================================================================
    // KLAUSUL HUKUM
    // ================================================================
    @Column(columnDefinition = "TEXT")
    private String confidentialityClause;

    @Column(columnDefinition = "TEXT")
    private String disputeResolutionClause;

    // ================================================================
    // STATUS DAN MASA BERLAKU
    // ================================================================
    @Column(nullable = false)
    private LocalDate validityStartDate;

    @Column(nullable = false)
    private LocalDate validityEndDate;

    @Column(length = 100)
    private String validityDuration;

    /**
     * Status kontrak:
     * - DRAFT       : Dalam penyusunan
     * - PENDING     : Menunggu persetujuan
     * - ACTIVE      : Sedang berjalan
     * - EXPIRED     : Masa berlaku habis
     * - TERMINATED  : Dihentikan sebelum waktunya
     * - CANCELLED   : Dibatalkan
     */
    @NotBlank(message = "Status kontrak wajib diisi")
    @Column(nullable = false, length = 20)
    private String status = "DRAFT";

    // ================================================================
    // FILE KONTRAK (PDF)
    // ================================================================
    /** Path ke file PDF kontrak di server */
    @Column(length = 500)
    private String contractFilePath;

    /** Nama file asli saat di-download */
    @Column(length = 255)
    private String contractFileName;

    /** Ukuran file PDF dalam bytes */
    private Long contractFileSize;

    /** Hash SHA-256 file PDF untuk verifikasi integritas */
    @Column(length = 64)
    private String contractFileHash;

    // ================================================================
    // OWNERSHIP & AUDIT TRAIL
    // ================================================================

    /** User yang membuat kontrak (owner) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    /** User yang terakhir mengupdate kontrak */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_id", nullable = true)
    private User updatedBy;

    @Column(nullable = false, updatable = false)
    @JsonProperty("createdAt")
    private LocalDateTime createdAt;

    @Column(nullable = false)
    @JsonProperty("updatedAt")
    private LocalDateTime updatedAt;

    @Column(nullable = false, length = 20)
    private String approvalStatus = "PENDING_APPROVAL";

    @Column(length = 255)
    private String approvalNote;

    // ================================================================
    // METADATA TAMBAHAN
    // ================================================================
    @Column(length = 50)
    private String documentVersion = "1.0";

    @Column(length = 50)
    private String documentType = "KONTRAK_PENGADAAN";

    @Column(columnDefinition = "TEXT")
    private String tags; // JSON array of tags

    @Column(columnDefinition = "TEXT")
    private String signatureArea; // JSON — data tanda tangan

    // ================================================================
    // LIFECYCLE CALLBACKS
    // ================================================================
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ================================================================
    // GETTERS & SETTERS (semua field)
    // ================================================================
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPublicId() { return publicId; }
    public void setPublicId(String publicId) { this.publicId = publicId; }

    public String getContractNumber() { return contractNumber; }
    public void setContractNumber(String contractNumber) { this.contractNumber = contractNumber; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public LocalDate getContractDate() { return contractDate; }
    public void setContractDate(LocalDate contractDate) { this.contractDate = contractDate; }

    public String getFirstPartyCompany() { return firstPartyCompany; }
    public void setFirstPartyCompany(String firstPartyCompany) { this.firstPartyCompany = firstPartyCompany; }

    public String getFirstPartyAddress() { return firstPartyAddress; }
    public void setFirstPartyAddress(String firstPartyAddress) { this.firstPartyAddress = firstPartyAddress; }

    public String getFirstPartyPic() { return firstPartyPic; }
    public void setFirstPartyPic(String firstPartyPic) { this.firstPartyPic = firstPartyPic; }

    public String getFirstPartyPosition() { return firstPartyPosition; }
    public void setFirstPartyPosition(String firstPartyPosition) { this.firstPartyPosition = firstPartyPosition; }

    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }

    public String getSecondPartyCompany() { return secondPartyCompany; }
    public void setSecondPartyCompany(String secondPartyCompany) { this.secondPartyCompany = secondPartyCompany; }

    public String getSecondPartyAddress() { return secondPartyAddress; }
    public void setSecondPartyAddress(String secondPartyAddress) { this.secondPartyAddress = secondPartyAddress; }

    public String getSecondPartyPic() { return secondPartyPic; }
    public void setSecondPartyPic(String secondPartyPic) { this.secondPartyPic = secondPartyPic; }

    public String getSecondPartyPosition() { return secondPartyPosition; }
    public void setSecondPartyPosition(String secondPartyPosition) { this.secondPartyPosition = secondPartyPosition; }

    public String getSecondPartyType() { return secondPartyType; }
    public void setSecondPartyType(String secondPartyType) { this.secondPartyType = secondPartyType; }

    public String getObjectDescription() { return objectDescription; }
    public void setObjectDescription(String objectDescription) { this.objectDescription = objectDescription; }

    public String getScopeOfWork() { return scopeOfWork; }
    public void setScopeOfWork(String scopeOfWork) { this.scopeOfWork = scopeOfWork; }

    public Double getContractValue() { return contractValue; }
    public void setContractValue(Double contractValue) { this.contractValue = contractValue; }

    public String getContractValueText() { return contractValueText; }
    public void setContractValueText(String contractValueText) { this.contractValueText = contractValueText; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public String getRightsAndObligationsFirstParty() { return rightsAndObligationsFirstParty; }
    public void setRightsAndObligationsFirstParty(String rightsAndObligationsFirstParty) { this.rightsAndObligationsFirstParty = rightsAndObligationsFirstParty; }

    public String getRightsAndObligationsSecondParty() { return rightsAndObligationsSecondParty; }
    public void setRightsAndObligationsSecondParty(String rightsAndObligationsSecondParty) { this.rightsAndObligationsSecondParty = rightsAndObligationsSecondParty; }

    public String getConfidentialityClause() { return confidentialityClause; }
    public void setConfidentialityClause(String confidentialityClause) { this.confidentialityClause = confidentialityClause; }

    public String getDisputeResolutionClause() { return disputeResolutionClause; }
    public void setDisputeResolutionClause(String disputeResolutionClause) { this.disputeResolutionClause = disputeResolutionClause; }

    public LocalDate getValidityStartDate() { return validityStartDate; }
    public void setValidityStartDate(LocalDate validityStartDate) { this.validityStartDate = validityStartDate; }

    public LocalDate getValidityEndDate() { return validityEndDate; }
    public void setValidityEndDate(LocalDate validityEndDate) { this.validityEndDate = validityEndDate; }

    public String getValidityDuration() { return validityDuration; }
    public void setValidityDuration(String validityDuration) { this.validityDuration = validityDuration; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getContractFilePath() { return contractFilePath; }
    public void setContractFilePath(String contractFilePath) { this.contractFilePath = contractFilePath; }

    public String getContractFileName() { return contractFileName; }
    public void setContractFileName(String contractFileName) { this.contractFileName = contractFileName; }

    public Long getContractFileSize() { return contractFileSize; }
    public void setContractFileSize(Long contractFileSize) { this.contractFileSize = contractFileSize; }

    public String getContractFileHash() { return contractFileHash; }
    public void setContractFileHash(String contractFileHash) { this.contractFileHash = contractFileHash; }

    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }

    public User getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(User updatedBy) { this.updatedBy = updatedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

    public String getApprovalNote() { return approvalNote; }
    public void setApprovalNote(String approvalNote) { this.approvalNote = approvalNote; }

    public String getDocumentVersion() { return documentVersion; }
    public void setDocumentVersion(String documentVersion) { this.documentVersion = documentVersion; }

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public String getSignatureArea() { return signatureArea; }
    public void setSignatureArea(String signatureArea) { this.signatureArea = signatureArea; }
}
