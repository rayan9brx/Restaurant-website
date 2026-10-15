package com.rayen.Restaurant.auth;

import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;

public record RegistrationRequest(
        @NotBlank(message = "Enter your name.") @Size(max = 100, message = "Name must be at most 100 characters.") String name,
        @NotBlank(message = "Enter your email.") @Email(message = "Enter a valid email.")
        @Size(max = 254, message = "Email must be at most 254 characters.") String email,
        @NotBlank(message = "Enter a password.")
        @Size(max = 72, message = "Password must be at most 72 characters.") String password) {
    public RegistrationRequest {
        name = name == null ? null : name.trim();
        email = email == null ? null : AppUser.normalizeEmail(email);
    }

    // BCrypt accepts at most 72 bytes, including multi-byte characters.
    @AssertTrue(message = "Password must be at most 72 UTF-8 bytes.")
    public boolean isPasswordWithinByteLimit() {
        return password == null || password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
