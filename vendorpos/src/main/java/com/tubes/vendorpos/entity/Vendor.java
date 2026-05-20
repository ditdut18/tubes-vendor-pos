package com.tubes.vendorpos.entity;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "vendors")
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Nama perusahaan tidak boleh kosong")
    @Size(min = 3, max = 100, message = "Nama perusahaan harus antara 3-100 karakter")
    @Column(nullable = false)
    private String namaPerusahaan;

    @NotBlank(message = "Kontak tidak boleh kosong")
    @Size(min = 7, max = 20, message = "Kontak harus antara 7-20 karakter")
    @Column(nullable = false)
    private String kontak;

    @NotBlank(message = "Alamat tidak boleh kosong")
    @Size(min = 5, max = 255, message = "Alamat harus antara 5-255 karakter")
    @Column(nullable = false)
    private String alamat;

    @NotBlank(message = "Status kerjasama tidak boleh kosong")
    @Column(nullable = false)
    private String statusKerjasama;

    @Column(name = "default_price")
    private Double defaultPrice = 500000.0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @JsonProperty("createdAt")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @JsonProperty("updatedAt")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // --- GETTER & SETTER ---
    // Di Java, kita butuh fungsi di bawah ini untuk mengambil dan mengisi data.
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNamaPerusahaan() { return namaPerusahaan; }
    public void setNamaPerusahaan(String namaPerusahaan) { this.namaPerusahaan = namaPerusahaan; }

    public String getKontak() { return kontak; }
    public void setKontak(String kontak) { this.kontak = kontak; }

    public String getAlamat() { return alamat; }
    public void setAlamat(String alamat) { this.alamat = alamat; }

    public String getStatusKerjasama() { return statusKerjasama; }
    public void setStatusKerjasama(String statusKerjasama) { this.statusKerjasama = statusKerjasama; }

    public Double getDefaultPrice() { return defaultPrice; }
    public void setDefaultPrice(Double defaultPrice) { this.defaultPrice = defaultPrice; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public String toString() {
        return "Vendor{" +
                "id=" + id +
                ", namaPerusahaan='" + namaPerusahaan + '\'' +
                ", kontak='" + kontak + '\'' +
                ", alamat='" + alamat + '\'' +
                ", statusKerjasama='" + statusKerjasama + '\'' +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}