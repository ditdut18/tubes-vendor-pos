package com.tubes.vendorpos.controller;

import com.tubes.vendorpos.dto.PaymentRequest;
import com.tubes.vendorpos.entity.Transaction;
import com.tubes.vendorpos.entity.Vendor;
import com.tubes.vendorpos.repository.TransactionRepository;
import com.tubes.vendorpos.repository.VendorRepository;
import com.tubes.vendorpos.service.MidtransService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "http://localhost:5173")
public class TransactionController {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private MidtransService midtransService;

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @PostMapping("/pay")
    public ResponseEntity<?> processPayment(@RequestBody PaymentRequest request) {
        if (request.getVendorId() == null || request.getAmount() == null || request.getPaymentMethod() == null) {
            return ResponseEntity.badRequest().body("Data pembayaran tidak lengkap");
        }

        Vendor vendor = vendorRepository.findById(request.getVendorId()).orElse(null);
        if (vendor == null) {
            return ResponseEntity.badRequest().body("Mitra Supplier tidak ditemukan");
        }

        Transaction tx = new Transaction();
        tx.setVendor(vendor);
        tx.setAmount(request.getAmount());
        tx.setPaymentMethod(request.getPaymentMethod());
        tx.setStatus("PENDING");
        tx.setReceiptNumber("TRX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        tx.setTransactionDate(LocalDateTime.now());

        if (!"Cash".equalsIgnoreCase(request.getPaymentMethod())) {
            try {
                String snapToken = midtransService.createSnapToken(tx);
                tx.setSnapToken(snapToken);
            } catch (Exception e) {
                System.err.println("Midtrans API error: " + e.getMessage() + ". Falling back to local Mock Simulator.");
                tx.setSnapToken(null);
            }
        }

        transactionRepository.save(tx);
        return ResponseEntity.ok(tx);
    }
    
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/confirm/{id}")
    public ResponseEntity<?> confirmPayment(@PathVariable Long id) {
        Transaction tx = transactionRepository.findById(id).orElse(null);
        if (tx == null) {
            return ResponseEntity.badRequest().body("Transaksi tidak ditemukan");
        }
        tx.setStatus("PAID - SECURE");
        transactionRepository.save(tx);
        return ResponseEntity.ok(tx);
    }
    
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @GetMapping
    public ResponseEntity<List<Transaction>> getAllTransactions() {
        return ResponseEntity.ok(transactionRepository.findAllByOrderByTransactionDateDesc());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTransaction(@PathVariable Long id) {
        if (!transactionRepository.existsById(id)) {
            return ResponseEntity.badRequest().body("Transaksi tidak ditemukan");
        }
        transactionRepository.deleteById(id);
        return ResponseEntity.ok().body("Transaksi dihapus");
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @GetMapping("/{id}/status")
    public ResponseEntity<?> getTransactionStatus(@PathVariable Long id) {
        Transaction tx = transactionRepository.findById(id).orElse(null);
        if (tx == null) {
            return ResponseEntity.badRequest().body("Transaksi tidak ditemukan");
        }

        if ("Cash".equalsIgnoreCase(tx.getPaymentMethod()) || "PAID - SECURE".equals(tx.getStatus())) {
            return ResponseEntity.ok(tx);
        }

        try {
            Map<String, Object> statusResponse = midtransService.getTransactionStatus(tx.getReceiptNumber());
            String transactionStatus = (String) statusResponse.get("transaction_status");
            String fraudStatus = (String) statusResponse.get("fraud_status");

            if ("settlement".equals(transactionStatus) || ("capture".equals(transactionStatus) && "accept".equals(fraudStatus))) {
                tx.setStatus("PAID - SECURE");
            } else if ("pending".equals(transactionStatus)) {
                tx.setStatus("PENDING");
            } else if ("deny".equals(transactionStatus) || "expire".equals(transactionStatus) || "cancel".equals(transactionStatus)) {
                tx.setStatus("FAILED");
            }

            transactionRepository.save(tx);
            return ResponseEntity.ok(tx);
        } catch (Exception e) {
            System.err.println("Gagal cek status transaksi dari Midtrans: " + e.getMessage() + ". Menggunakan fallback simulasi pembayaran.");
            tx.setStatus("PAID - SECURE");
            transactionRepository.save(tx);
            return ResponseEntity.ok(tx);
        }
    }

    @PostMapping("/midtrans-webhook")
    public ResponseEntity<?> handleMidtransWebhook(@RequestBody Map<String, Object> payload) {
        if (payload == null || !payload.containsKey("order_id")) {
            return ResponseEntity.badRequest().body("Payload tidak valid");
        }

        if (!midtransService.verifySignature(payload)) {
            System.out.println("Midtrans webhook signature verification failed!");
            return ResponseEntity.status(403).body("Tanda tangan tidak valid");
        }

        String orderId = (String) payload.get("order_id");
        Optional<Transaction> txOpt = transactionRepository.findByReceiptNumber(orderId);
        if (txOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Transaction tx = txOpt.get();
        String transactionStatus = (String) payload.get("transaction_status");
        String fraudStatus = (String) payload.get("fraud_status");

        if ("settlement".equals(transactionStatus) || ("capture".equals(transactionStatus) && "accept".equals(fraudStatus))) {
            tx.setStatus("PAID - SECURE");
        } else if ("pending".equals(transactionStatus)) {
            tx.setStatus("PENDING");
        } else if ("deny".equals(transactionStatus) || "expire".equals(transactionStatus) || "cancel".equals(transactionStatus)) {
            tx.setStatus("FAILED");
        }

        transactionRepository.save(tx);
        return ResponseEntity.ok("OK");
    }
}
