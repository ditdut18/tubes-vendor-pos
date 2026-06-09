package com.tubes.vendorpos.repository;

import com.tubes.vendorpos.entity.Contract;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * REPOSITORY KONTRAK — Query Filtering Berdasarkan Role
 * 
 * Strategi Keamanan:
 * - Admin: SELECT tanpa filter (melihat SEMUA kontrak)
 * - User:  SELECT dengan filter owner_id (hanya kontrak miliknya)
 * - Supplier/Distributor: SELECT dengan filter vendor_id
 * 
 * Pencegahan IDOR:
 * - Gunakan publicId (UUID) di API, bukan id numerik
 * - Query selalu difilter berdasarkan user yang sedang login
 */
@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {

    // ================================================================
    // QUERY UNTUK ADMIN — Melihat SEMUA kontrak
    // ================================================================
    @Query("SELECT c FROM Contract c ORDER BY c.createdAt DESC")
    Page<Contract> findAllContracts(Pageable pageable);

    // ================================================================
    // QUERY UNTUK USER BIASA — Hanya kontrak miliknya
    // ================================================================
    @Query("SELECT c FROM Contract c WHERE c.owner.id = :ownerId ORDER BY c.createdAt DESC")
    Page<Contract> findByOwnerId(@Param("ownerId") Long ownerId, Pageable pageable);

    @Query("SELECT c FROM Contract c WHERE c.owner.id = :ownerId AND c.status = :status ORDER BY c.createdAt DESC")
    Page<Contract> findByOwnerIdAndStatus(@Param("ownerId") Long ownerId, 
                                          @Param("status") String status, 
                                          Pageable pageable);

    // ================================================================
    // QUERY UNTUK SUPPLIER/DISTRIBUTOR — Hanya kontrak terkait vendor
    // ================================================================
    @Query("SELECT c FROM Contract c WHERE c.vendor.id = :vendorId ORDER BY c.createdAt DESC")
    Page<Contract> findByVendorId(@Param("vendorId") Long vendorId, Pageable pageable);

    @Query("SELECT c FROM Contract c WHERE c.secondPartyCompany LIKE %:companyName% ORDER BY c.createdAt DESC")
    Page<Contract> findBySecondPartyName(@Param("companyName") String companyName, Pageable pageable);

    // ================================================================
    // QUERY BERDASARKAN PUBLIC ID (mencegah IDOR)
    // ================================================================
    @Query("SELECT c FROM Contract c WHERE c.publicId = :publicId")
    Optional<Contract> findByPublicId(@Param("publicId") String publicId);

    // ================================================================
    // QUERY VERIFIKASI AKSES — Cek apakah user berhak akses kontrak ini
    // ================================================================
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Contract c " +
           "WHERE c.publicId = :publicId AND c.owner.id = :userId")
    boolean isContractOwner(@Param("publicId") String publicId, @Param("userId") Long userId);

    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM Contract c " +
           "WHERE c.publicId = :publicId AND c.vendor.id = :vendorId")
    boolean isContractVendor(@Param("publicId") String publicId, @Param("vendorId") Long vendorId);

    // ================================================================
    // QUERY BERDASARKAN STATUS
    // ================================================================
    @Query("SELECT c FROM Contract c WHERE c.status = :status ORDER BY c.createdAt DESC")
    Page<Contract> findByStatus(@Param("status") String status, Pageable pageable);

    @Query("SELECT c FROM Contract c WHERE c.approvalStatus = :approvalStatus ORDER BY c.createdAt DESC")
    Page<Contract> findByApprovalStatus(@Param("approvalStatus") String approvalStatus, Pageable pageable);

    // ================================================================
    // QUERY PENCARIAN
    // ================================================================
    @Query("SELECT c FROM Contract c WHERE " +
           "LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.secondPartyCompany) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY c.createdAt DESC")
    Page<Contract> searchContracts(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT c FROM Contract c WHERE " +
           "(c.owner.id = :ownerId) AND " +
           "(LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.secondPartyCompany) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY c.createdAt DESC")
    Page<Contract> searchContractsByOwner(@Param("ownerId") Long ownerId,
                                           @Param("keyword") String keyword, 
                                           Pageable pageable);

    // ================================================================
    // QUERY STATISTIK
    // ================================================================
    @Query("SELECT COUNT(c) FROM Contract c WHERE c.status = :status")
    long countByStatus(@Param("status") String status);

    @Query("SELECT SUM(c.contractValue) FROM Contract c WHERE c.status = 'ACTIVE'")
    Double getTotalActiveContractValue();
}
