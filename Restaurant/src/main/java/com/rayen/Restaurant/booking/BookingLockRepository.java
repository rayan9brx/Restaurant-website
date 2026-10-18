package com.rayen.Restaurant.booking;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
public interface BookingLockRepository extends JpaRepository<BookingLock, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from BookingLock l where l.id = 1")
    BookingLock lock();
}
