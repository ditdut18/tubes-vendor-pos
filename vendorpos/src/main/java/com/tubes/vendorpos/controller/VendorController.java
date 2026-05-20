package com.tubes.vendorpos.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tubes.vendorpos.dto.ErrorResponse;
import com.tubes.vendorpos.dto.PaginatedResponse;
import com.tubes.vendorpos.entity.Vendor;
import com.tubes.vendorpos.repository.VendorRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/vendors")
@CrossOrigin(origins = "http://localhost:5173")
public class VendorController {

    @Autowired
    private VendorRepository vendorRepository;

    /**
     * Get all vendors with pagination and sorting
     * Query parameters: page (default 0), size (default 10), sortBy (default id), sortDir (default ASC)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<?> getAllVendors(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "ASC") String sortDir) {
        
        try {
            Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase());
            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
            Page<Vendor> vendorPage = vendorRepository.findAll(pageable);
            
            PaginatedResponse<Vendor> response = new PaginatedResponse<>(
                    vendorPage.getContent(),
                    page,
                    size,
                    vendorPage.getTotalElements()
            );
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(400, "Invalid sort direction. Use ASC or DESC"));
        }
    }

    /**
     * Get vendor by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<?> getVendorById(@PathVariable Long id) {
        var vendor = vendorRepository.findById(id);
        if (vendor.isPresent()) {
            return ResponseEntity.ok(vendor.get());
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(404, "Vendor dengan ID " + id + " tidak ditemukan"));
        }
    }

    /**
     * Create new vendor with validation
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createVendor(@Valid @RequestBody Vendor vendor, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            List<String> errors = bindingResult.getAllErrors()
                    .stream()
                    .map(error -> error.getDefaultMessage())
                    .collect(Collectors.toList());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(400, "Validasi gagal", errors));
        }

        try {
            Vendor savedVendor = vendorRepository.save(vendor);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedVendor);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Gagal menyimpan vendor: " + e.getMessage()));
        }
    }

    /**
     * Update vendor by ID
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateVendor(@PathVariable Long id, @Valid @RequestBody Vendor vendorDetails, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            List<String> errors = bindingResult.getAllErrors()
                    .stream()
                    .map(error -> error.getDefaultMessage())
                    .collect(Collectors.toList());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(400, "Validasi gagal", errors));
        }

        var vendorOptional = vendorRepository.findById(id);
        if (!vendorOptional.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(404, "Vendor dengan ID " + id + " tidak ditemukan"));
        }

        try {
            Vendor vendor = vendorOptional.get();
            vendor.setNamaPerusahaan(vendorDetails.getNamaPerusahaan());
            vendor.setKontak(vendorDetails.getKontak());
            vendor.setAlamat(vendorDetails.getAlamat());
            vendor.setStatusKerjasama(vendorDetails.getStatusKerjasama());
            vendor.setDefaultPrice(vendorDetails.getDefaultPrice());
            
            Vendor updatedVendor = vendorRepository.save(vendor);
            return ResponseEntity.ok(updatedVendor);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Gagal memperbarui vendor: " + e.getMessage()));
        }
    }

    /**
     * Delete vendor by ID
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteVendor(@PathVariable Long id) {
        var vendorOptional = vendorRepository.findById(id);
        if (!vendorOptional.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(404, "Vendor dengan ID " + id + " tidak ditemukan"));
        }

        try {
            vendorRepository.deleteById(id);
            return ResponseEntity.ok(new ErrorResponse(200, "Vendor berhasil dihapus"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Gagal menghapus vendor: " + e.getMessage()));
        }
    }
}