package com.sweetbyte.eats.repository.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sweetbyte.eats.application.enums.LedgerEntryType;
import com.sweetbyte.eats.application.model.LedgerEntry;

// The ledger (R-PRC-03). Append-only: services only call save() with a new entry and read.
// The role-scoped finders back the history view (R-PRC-04).
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

    Optional<LedgerEntry> findByOrderIdAndType(Long orderId, LedgerEntryType type);

    List<LedgerEntry> findByOrderIdOrderByRecordedAtAsc(Long orderId);

    List<LedgerEntry> findAllByOrderByRecordedAtAsc();                         // operator

    List<LedgerEntry> findByCustomerIdOrderByRecordedAtAsc(Long customerId);     // customer

    List<LedgerEntry> findByRestaurantIdOrderByRecordedAtAsc(Long restaurantId); // restaurant

    List<LedgerEntry> findByCourierIdOrderByRecordedAtAsc(Long courierId);       // courier

    boolean existsByOrderIdAndType(Long orderId, LedgerEntryType type);
}
