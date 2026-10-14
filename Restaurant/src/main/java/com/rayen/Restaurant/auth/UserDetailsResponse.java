package com.rayen.Restaurant.auth;

import java.time.Instant;

// Return safe account fields, never the stored password hash.
public record UserDetailsResponse(Long id, String name, String email, Role role, Instant createdAt) {
    public static UserDetailsResponse from(AppUser user) {
        return new UserDetailsResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getCreatedAt());
    }
}
