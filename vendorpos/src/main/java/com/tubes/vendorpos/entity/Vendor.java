package com.tubes.vendorpos.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "vendors")
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String namaPerusahaan;
    private String kontak;
    private String alamat;
    private String statusKerjasama; // Misalnya: Aktif, Pending, Berakhir

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
}