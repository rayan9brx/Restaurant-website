package com.rayen.Restaurant.booking;

import com.rayen.Restaurant.auth.UserRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class BookingService {
    private final BookingRepository bookings;
    private final BookingLockRepository locks;
    private final UserRepository users;
    private final BookingSettings settings;

    public BookingService(BookingRepository bookings, BookingLockRepository locks,
                          UserRepository users, BookingSettings settings) {
        this.bookings = bookings;
        this.locks = locks;
        this.users = users;
        this.settings = settings;
    }

    @Bean
    ApplicationRunner initializeBookingLock() {
        return args -> {
            if (locks.existsById(1L)) return;
            try {
                locks.saveAndFlush(new BookingLock());
            } catch (DataIntegrityViolationException race) {
                // Another application instance may have created the row first.
                if (!locks.existsById(1L)) throw race;
            }
        };
    }

    private LocalDateTime now() {
        return LocalDateTime.now(BookingSettings.ZONE);
    }

    private void validateDateAndGuests(LocalDate date, int guests) {
        if (date.isBefore(now().toLocalDate())) {
            fail(400, "Please choose today or a future date.");
        }
        if (guests < 1 || guests > settings.getMaxPartySize()) {
            fail(400, "Choose between 1 and " + settings.getMaxPartySize() + " guests.");
        }
    }

    public Map<String, Object> availability(LocalDate date, int guests) {
        validateDateAndGuests(date, guests);
        return Map.of("slots", slots(date, guests), "maxPartySize", settings.getMaxPartySize(),
                "timezone", "Europe/Berlin", "today", now().toLocalDate());
    }

    private boolean occupiesSeats(Booking booking) {
        return Set.of("PENDING", "CONFIRMED").contains(booking.status);
    }

    private List<LocalTime> slots(LocalDate date, int guests) {
        List<LocalTime> available = new ArrayList<>();
        if (settings.getClosedDays().contains(date.getDayOfWeek())) return available;

        List<Booking> active = bookings.findByDateOrderByTimeAsc(date).stream()
                .filter(this::occupiesSeats).toList();
        int firstMinute = settings.getOpens().toSecondOfDay() / 60;
        int lastMinute = settings.getCloses().toSecondOfDay() / 60 - settings.getDurationMinutes();

        for (int minute = firstMinute; minute <= lastMinute; minute += settings.getIntervalMinutes()) {
            LocalTime start = LocalTime.of(minute / 60, minute % 60);
            LocalTime end = start.plusMinutes(settings.getDurationMinutes());
            if (!date.atTime(start).isAfter(now())) continue;
            if (hasCapacity(active, start, end, guests)) available.add(start);
        }
        return available;
    }

    private boolean hasCapacity(List<Booking> active, LocalTime start, LocalTime end, int guests) {
        // Occupancy can increase only at the start of a reservation.
        List<LocalTime> checkpoints = new ArrayList<>();
        checkpoints.add(start);
        for (Booking booking : active) {
            if (booking.time.isAfter(start) && booking.time.isBefore(end)) {
                checkpoints.add(booking.time);
            }
        }
        for (LocalTime time : checkpoints) {
            int occupied = 0;
            for (Booking booking : active) {
                // A table leaving at this exact time no longer occupies seats.
                if (!booking.time.isAfter(time) && booking.endTime.isAfter(time)) {
                    occupied += booking.guests;
                }
            }
            if (guests + occupied > settings.getCapacity()) return false;
        }
        return true;
    }

    @Transactional
    public Booking create(String email, BookingRequest request) {
        locks.lock();
        var user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        // A retry after a lost response returns the same reservation.
        var existing = bookings.findByUserIdAndRequestKey(user.getId(), request.requestKey().toString());
        if (existing.isPresent()) return existing.get();

        validateDateAndGuests(request.date(), request.guests());
        if (!slots(request.date(), request.guests()).contains(request.time())) {
            fail(409, "That time is unavailable. Please choose another slot.");
        }
        Booking booking = new Booking();
        booking.user = user;
        booking.name = request.name().trim();
        booking.email = request.email().trim();
        booking.phone = request.phone().trim();
        booking.date = request.date();
        booking.time = request.time();
        booking.endTime = request.time().plusMinutes(settings.getDurationMinutes());
        booking.guests = request.guests();
        booking.specialRequests = request.specialRequests();
        booking.status = "PENDING";
        booking.reference = UUID.randomUUID().toString();
        booking.requestKey = request.requestKey().toString();
        booking.createdAt = Instant.now();
        return bookings.saveAndFlush(booking);
    }

    @Transactional
    public Booking change(Long id, String email, String status, boolean admin) {
        locks.lock();
        Booking booking = bookings.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found."));
        if (!admin && !booking.user.getEmail().equals(email)) {
            fail(403, "This reservation belongs to another customer.");
        }
        if (admin) {
            boolean validStatus = Set.of("CONFIRMED", "REJECTED").contains(status);
            if (!validStatus || !booking.status.equals("PENDING")) {
                fail(409, "Only pending requests can be confirmed or rejected.");
            }
        } else if (!occupiesSeats(booking) || !booking.date.atTime(booking.time).isAfter(now())) {
            fail(409, "Only future pending or confirmed bookings can be cancelled.");
        }
        booking.status = admin ? status : "CANCELLED";
        return bookings.saveAndFlush(booking);
    }

    private static void fail(int code, String message) {
        throw new ResponseStatusException(HttpStatus.valueOf(code), message);
    }
}
