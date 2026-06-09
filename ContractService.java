package com.tubes.vendorpos.service;

import com.tubes.vendorpos.entity.Contract;
import com.tubes.vendorpos.entity.User;
import com.tubes.vendorpos.entity.Vendor;
import com.tubes.vendorpos.repository.ContractRepository;
import com.tubes.vendorpos.repository.UserRepository;
import com.tubes.vendorpos.repository.VendorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.UUID;

/**
 * SERVICE KONTRAK — Business Logic dengan Ownership Validation
 * 
 * Setiap method melakukan validasi akses berdasarkan role user:
 * - ADMIN → akses penuh ke semua kontrak
 * - USER → hanya akses kontrak yang dimiliki (owner_id = user.id)
 * - SUPPLIER → hanya akses kontrak dengan vendor_id terkait
 */
@Service
public class ContractService {

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private ContractPdfGeneratorService pdfGeneratorService;

    /** Direktori penyimpanan file PDF kontrak */
    private final String CONTRACT_STORAGE_PATH = "uploads/contracts/";

    // ================================================================
    // STRATEGI PENGAMBILAN DATA — Filter berdasarkan role
    // ================================================================

    /**
     * Mendapatkan kontrak dengan filtering berdasarkan role.
     * - ADMIN: semua kontrak
     * - USER: hanya kontrak miliknya
     */
    public Page<Contract> getContractsByRole(User currentUser, int page, int size, 
                                              String sortBy, String sortDir) {
        Sort.Direction direction = Sort.Direction.fromString(sortDir.toUpperCase());
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        if ("ADMIN".equals(currentUser.getRole())) {
            return contractRepository.findAllContracts(pageable);
        } else {
            // USER biasa — hanya kontrak miliknya
            return contractRepository.findByOwnerId(currentUser.getId(), pageable);
        }
    }

    /**
     * Mendapatkan detail kontrak dengan validasi akses.
     * Cegah IDOR dengan mengecek ownership.
     */
    public Contract getContractByPublicId(String publicId, User currentUser) {
        Contract contract = contractRepository.findByPublicId(publicId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Kontrak tidak ditemukan"));

        // Validasi akses berdasarkan role
        validateAccess(contract, currentUser);
        
        return contract;
    }

    /**
     * Validasi akses ke kontrak tertentu.
     * 
     * Admin → boleh akses semua
     * User → hanya jika owner
     * Supplier/Distributor → hanya jika vendor terkait
     */
    private void validateAccess(Contract contract, User currentUser) {
        if ("ADMIN".equals(currentUser.getRole())) {
            return; // Admin boleh akses semua
        }

        // Cek apakah user adalah owner kontrak
        if (contract.getOwner().getId().equals(currentUser.getId())) {
            return;
        }

        // Cek apakah user terkait dengan vendor di kontrak
        if (contract.getVendor() != null) {
            // Logika: cek apakah user adalah PIC dari vendor ini
            // (Implementasi tergantung pada struktur User-Vendor relationship)
        }

        throw new ResponseStatusException(
            HttpStatus.FORBIDDEN, "Akses ditolak: Anda tidak memiliki hak akses ke kontrak ini");
    }

    // ================================================================
    // CRUD KONTRAK
    // ================================================================

    /**
     * Membuat kontrak baru.
     * Owner otomatis adalah user yang sedang login.
     */
    public Contract createContract(Contract contractData, User currentUser, 
                                    Long vendorId) {
        Contract contract = new Contract();
        
        // Set UUID publik untuk cegah IDOR
        contract.setPublicId(UUID.randomUUID().toString());
        
        // Set data kontrak
        contract.setContractNumber(contractData.getContractNumber());
        contract.setTitle(contractData.getTitle());
        contract.setContractDate(contractData.getContractDate());
        
        // Pihak Pertama = perusahaan (dari data user/admin)
        contract.setFirstPartyCompany(contractData.getFirstPartyCompany());
        contract.setFirstPartyAddress(contractData.getFirstPartyAddress());
        contract.setFirstPartyPic(contractData.getFirstPartyPic());
        contract.setFirstPartyPosition(contractData.getFirstPartyPosition());
        
        // Pihak Kedua = supplier/distributor
        if (vendorId != null) {
            Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Vendor tidak ditemukan"));
            contract.setVendor(vendor);
            contract.setSecondPartyCompany(vendor.getNamaPerusahaan());
            contract.setSecondPartyAddress(vendor.getAlamat());
            contract.setSecondPartyPic(vendor.getKontak());
        } else {
            contract.setSecondPartyCompany(contractData.getSecondPartyCompany());
            contract.setSecondPartyAddress(contractData.getSecondPartyAddress());
            contract.setSecondPartyPic(contractData.getSecondPartyPic());
            contract.setSecondPartyPosition(contractData.getSecondPartyPosition());
        }
        
        // Objek dan nilai kontrak
        contract.setObjectDescription(contractData.getObjectDescription());
        contract.setScopeOfWork(contractData.getScopeOfWork());
        contract.setContractValue(contractData.getContractValue());
        contract.setContractValueText(contractData.getContractValueText());
        contract.setPaymentTerms(contractData.getPaymentTerms());
        
        // Hak dan kewajiban
        contract.setRightsAndObligationsFirstParty(contractData.getRightsAndObligationsFirstParty());
        contract.setRightsAndObligationsSecondParty(contractData.getRightsAndObligationsSecondParty());
        
        // Klausul
        contract.setConfidentialityClause(contractData.getConfidentialityClause());
        contract.setDisputeResolutionClause(contractData.getDisputeResolutionClause());
        
        // Masa berlaku
        contract.setValidityStartDate(contractData.getValidityStartDate());
        contract.setValidityEndDate(contractData.getValidityEndDate());
        contract.setValidityDuration(contractData.getValidityDuration());
        
        // Ownership
        contract.setOwner(currentUser);
        contract.setStatus("DRAFT");
        contract.setApprovalStatus("PENDING_APPROVAL");
        
        // Metadata
        contract.setDocumentVersion("1.0");
        contract.setDocumentType(contractData.getDocumentType());
        contract.setTags(contractData.getTags());
        contract.setSignatureArea(contractData.getSignatureArea());

        Contract savedContract = contractRepository.save(contract);

        // Generate PDF kontrak
        try {
            generateContractPdf(savedContract);
        } catch (Exception e) {
            System.err.println("Gagal generate PDF: " + e.getMessage());
        }

        return savedContract;
    }

    /**
     * Generate PDF kontrak dan simpan ke file system.
     */
    private void generateContractPdf(Contract contract) throws Exception {
        // Pastikan direktori penyimpanan ada
        Path storagePath = Paths.get(CONTRACT_STORAGE_PATH);
        Files.createDirectories(storagePath);

        // Nama file: KTR2026-01-DK01.pdf
        String fileName = contract.getContractNumber() + ".pdf";
        Path filePath = storagePath.resolve(fileName);

        // Generate PDF menggunakan service
        byte[] pdfBytes = pdfGeneratorService.generateContractPdf(contract);
        Files.write(filePath, pdfBytes);

        // Hitung hash SHA-256 untuk verifikasi integritas
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hashBytes = digest.digest(pdfBytes);
        StringBuilder hexString = new StringBuilder();
        for (byte b : hashBytes) {
            hexString.append(String.format("%02x", b));
        }

        // Update metadata file di database
        contract.setContractFilePath(filePath.toString());
        contract.setContractFileName(fileName);
        contract.setContractFileSize((long) pdfBytes.length);
        contract.setContractFileHash(hexString.toString());
        
        contractRepository.save(contract);
    }
}
