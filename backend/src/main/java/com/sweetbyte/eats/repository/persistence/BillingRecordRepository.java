package com.sweetbyte.eats.repository.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sweetbyte.eats.application.enums.BillingRecordType;
import com.sweetbyte.eats.application.model.BillingRecord;

// Billing (UC-PRC-01): one PAYMENT per order at placement, plus one REFUND if refunded. Append-only.
public interface BillingRecordRepository extends JpaRepository<BillingRecord, Long> {

    Optional<BillingRecord> findByOrderIdAndType(Long orderId, BillingRecordType type);

    boolean existsByOrderIdAndType(Long orderId, BillingRecordType type);

    List<BillingRecord> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}
