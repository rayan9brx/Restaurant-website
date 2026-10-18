package com.rayen.Restaurant.booking;
import jakarta.validation.constraints.*;
import java.time.*;
public record BookingRequest(
    @NotBlank @Size(max=100) String name,
    @NotBlank @Email @Size(max=254) String email,
    @NotBlank @Pattern(regexp="[+0-9() .-]{6,30}", message="Enter a phone number with 6–30 characters.") String phone,
    @NotNull LocalDate date, @NotNull LocalTime time,
    @NotNull @Min(1) Integer guests,
    @Size(max=500) String specialRequests,
    @NotNull java.util.UUID requestKey) {}
