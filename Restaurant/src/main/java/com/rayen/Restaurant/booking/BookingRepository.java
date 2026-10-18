package com.rayen.Restaurant.booking;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.*;
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByDateOrderByTimeAsc(LocalDate date);
    List<Booking> findByDateBetweenOrderByDateAscTimeAscIdAsc(LocalDate start, LocalDate end);
    List<Booking> findByUserEmailOrderByDateDescTimeDesc(String email);
    List<Booking> findAllByOrderByDateDescTimeAsc();
    Optional<Booking> findByUserIdAndRequestKey(Long userId, String requestKey);
}
