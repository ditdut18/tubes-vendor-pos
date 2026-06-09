package com.tubes.vendorpos.controller;

import com.tubes.vendorpos.entity.Contract;
import com.tubes.vendorpos.entity.User;
import com.tubes.vendorpos.repository.ContractRepository;
import com.tubes.vendorpos.repository.UserRepository;
import com.tubes.vendorpos.service.ContractService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * CONTROLLER KONTRAK — Endpoint dengan Proteksi RBAC & Ownership
 * 
 * Endpoints:
 * - GET    /api/contracts              → Semua kontrak (Admin) / kontrak sendiri (User)
 * - GET    /api/contracts/{publicId}   → Detail kontrak + validasi akses
 * - POST   /api/contracts              → Buat kontrak baru
 * - PUT    /api/contracts/{publicId}   → Update kontrak (hanya owner atau Admin)
 * - DELETE /api/contracts/{publicId}   → Hapus kontrak (hanya Admin)
 * - GET    /api/contracts/{publicId}/download → Download PDF dengan validasi akses
 * - PUT    /api/contracts/{publicId}/approve  → Approve kontrak (Admin only)
 */
@RestController
@RequestMapping("/api/contracts")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"}, 
             allowCredentials = "true")
public class ContractController {

    @Autowired
    private ContractService contractService;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Helper: Mendapatkan user yang sedang login dari JWT token.
     */
    private User getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User tidak ditemukan"));
    }

    // ================================================================
    // GET /api/contracts — Daftar kontrak (filtered by role)
    // ================================================================
    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Page<Contract>> getAllContracts(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        
        User currentUser = getCurrentUser(authentication);
        Page<Contract> contracts = contractService.getContractsByRole(
            currentUser, page, size, sortBy, sortDir);
        return ResponseEntity.ok(contracts);
    }

    // ================================================================
    // GET /api/contracts/{publicId} — Detail kontrak
    // ================================================================
    @GetMapping("/{publicId}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<?> getContract(
            @PathVariable String publicId,
            Authentication authentication) {
        
        User currentUser = getCurrentUser(authentication);
        
        try {
            Contract contract = contractService.getContractByPublicId(publicId, currentUser);
            return ResponseEntity.ok(contract);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode())
                .body(e.getReason());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Terjadi kesalahan: " + e.getMessage());
        }
    }

    // ================================================================
    // POST /api/contracts — Buat kontrak baru
    // ================================================================
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createContract(
            @RequestBody Contract contractData,
            @RequestParam(required = false) Long vendorId,
            Authentication authentication) {
        
        User currentUser = getCurrentUser(authentication);
        
        try {
            Contract saved = contractService.createContract(
                contractData, currentUser, vendorId);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body("Gagal membuat kontrak: " + e.getMessage());
        }
    }

    // ================================================================
    // GET /api/contracts/{publicId}/download — Download PDF kontrak
    // ================================================================
    @GetMapping("/{publicId}/download")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<Resource> downloadContractPdf(
            @PathVariable String publicId,
            Authentication authentication) {
        
        User currentUser = getCurrentUser(authentication);
        Contract contract = contractService.getContractByPublicId(publicId, currentUser);

        try {
            Path filePath = Paths.get(contract.getContractFilePath());
            Resource resource = new FileSystemResource(filePath);

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/pdf";
            }

            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                    "attachment; filename=\"" + contract.getContractFileName() + "\"")
                .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ================================================================
    // PUT /api/contracts/{publicId}/approve — Approve kontrak
    // ================================================================
    @PutMapping("/{publicId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveContract(
            @PathVariable String publicId,
            @RequestParam String approvalStatus,
            @RequestParam(required = false) String note,
            Authentication authentication) {
        
        User currentUser = getCurrentUser(authentication);
        Contract contract = contractRepository.findByPublicId(publicId)
            .orElse(null);

        if (contract == null) {
            return ResponseEntity.notFound().build();
        }

        contract.setApprovalStatus(approvalStatus);
        contract.setApprovalNote(note);
        contract.setUpdatedBy(currentUser);

        if ("APPROVED".equals(approvalStatus)) {
            contract.setStatus("ACTIVE");
        }

        contractRepository.save(contract);
        return ResponseEntity.ok(contract);
    }

    // ================================================================
    // DELETE /api/contracts/{publicId} — Hapus kontrak (Admin only)
    // ================================================================
    @DeleteMapping("/{publicId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteContract(@PathVariable String publicId) {
        Contract contract = contractRepository.findByPublicId(publicId)
            .orElse(null);

        if (contract == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            // Hapus file PDF jika ada
            if (contract.getContractFilePath() != null) {
                Files.deleteIfExists(Paths.get(contract.getContractFilePath()));
            }
            contractRepository.delete(contract);
            return ResponseEntity.ok("Kontrak berhasil dihapus");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Gagal menghapus kontrak: " + e.getMessage());
        }
    }
}
