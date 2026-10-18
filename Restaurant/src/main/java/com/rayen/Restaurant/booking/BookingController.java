package com.rayen.Restaurant.booking;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class BookingController {
    private final BookingService service;
    private final BookingRepository bookings;

    public BookingController(BookingService service, BookingRepository bookings) {
        this.service = service;
        this.bookings = bookings;
    }

    @GetMapping("/api/reservations/availability")
    public Map<String, Object> availability(@RequestParam LocalDate date, @RequestParam int guests) {
        return service.availability(date, guests);
    }

    @PostMapping("/api/reservations")
    public ResponseEntity<Booking> create(Principal principal, @Valid @RequestBody BookingRequest request) {
        return ResponseEntity.status(201).body(service.create(principal.getName(), request));
    }

    @GetMapping("/api/reservations/mine")
    public List<Booking> mine(Principal principal) {
        return bookings.findByUserEmailOrderByDateDescTimeDesc(principal.getName());
    }

    @PostMapping("/api/reservations/{id}/cancel")
    public Booking cancel(Principal principal, @PathVariable Long id) {
        return service.change(id, principal.getName(), "CANCELLED", false);
    }

    @GetMapping("/api/admin/reservations")
    public List<Booking> list(@RequestParam(required = false) LocalDate date,
                              @RequestParam(required = false) String status,
                              @RequestParam(required = false) LocalDate start,
                              @RequestParam(required = false) LocalDate end) {
        List<Booking> results;
        if (start != null || end != null) {
            if (start == null || end == null || date != null || end.isBefore(start)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Choose both range dates, with the end on or after the start. Use date or a range, not both.");
            }
            // Both boundaries are included, matching the visible calendar dates.
            results = bookings.findByDateBetweenOrderByDateAscTimeAscIdAsc(start, end);
        } else {
            results = date == null
                    ? bookings.findAllByOrderByDateDescTimeAsc()
                    : bookings.findByDateOrderByTimeAsc(date);
        }
        if (status == null || status.isBlank()) return results;
        return results.stream().filter(booking -> booking.status.equals(status)).toList();
    }

    @GetMapping("/api/admin/reservations/{id}")
    public Booking details(@PathVariable Long id) {
        return bookings.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found."));
    }

    public record StatusRequest(String status) {}

    @PostMapping("/api/admin/reservations/{id}/status")
    public Booking change(Principal principal, @PathVariable Long id, @RequestBody StatusRequest request) {
        String status = request.status() == null ? "" : request.status();
        return service.change(id, principal.getName(), status, true);
    }
}
