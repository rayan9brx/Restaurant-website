package com.rayen.Restaurant.booking;
import jakarta.persistence.*;
// One database row serializes capacity changes across all application instances.
@Entity
public class BookingLock {
    @Id public Long id;
    public BookingLock() { id = 1L; }
}
