package com.sweetbyte.eats.repository.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sweetbyte.eats.application.model.BillingRecord;

// The fare saved per order at placement (UC-PRC-01). Keyed by order id.
public interface BillingRecordRepository extends JpaRepository<BillingRecord, Long> {
}
