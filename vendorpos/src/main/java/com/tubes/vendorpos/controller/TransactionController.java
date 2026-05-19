package com.tubes.vendorpos.controller;

import com.tubes.vendorpos.dto.PaymentRequest;
import com.tubes.vendorpos.entity.Transaction;
import com.tubes.vendorpos.entity.Vendor;
import com.tubes.vendorpos.repository.TransactionRepository;
import com.tubes.vendorpos.repository.VendorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private VendorRepository vendorRepository;

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
        tx.setStatus("PAID - SECURE");
        tx.setReceiptNumber("TRX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        tx.setTransactionDate(LocalDateTime.now());

        transactionRepository.save(tx);
        return ResponseEntity.ok(tx);
    }
    
    @GetMapping
    public ResponseEntity<List<Transaction>> getAllTransactions() {
        return ResponseEntity.ok(transactionRepository.findAllByOrderByTransactionDateDesc());
    }
}
