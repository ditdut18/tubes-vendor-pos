package com.tubes.vendorpos.repository;

import com.tubes.vendorpos.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findAllByOrderByTransactionDateDesc();
    Optional<Transaction> findByReceiptNumber(String receiptNumber);
}
