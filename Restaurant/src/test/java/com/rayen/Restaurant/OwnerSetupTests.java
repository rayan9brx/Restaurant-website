package com.rayen.Restaurant;

import com.rayen.Restaurant.auth.*;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OwnerSetupTests {
    private MockEnvironment settings() {
        return new MockEnvironment().withProperty("restaurant.owner.name", "Owner")
                .withProperty("restaurant.owner.email", " OWNER@EXAMPLE.COM ")
                .withProperty("restaurant.owner.password", "owner-test-password");
    }

    private void setup(UserRepository users, MockEnvironment environment) {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            new OwnerSetup(users, new BCryptPasswordEncoder(), environment, factory.getValidator()).run(null);
        }
    }

    @Test
    void createsFirstOwnerWithHashAndIsIdempotentForExistingOwner() {
        UserRepository users = mock(UserRepository.class);
        when(users.findByEmail("owner@example.com")).thenReturn(Optional.empty());
        setup(users, settings());
        verify(users).saveAndFlush(argThat(user -> user.getRole() == Role.ADMIN
                && user.getEmail().equals("owner@example.com")
                && new BCryptPasswordEncoder().matches("owner-test-password", user.getPasswordHash())));
        reset(users);
        when(users.findByEmail("owner@example.com")).thenReturn(Optional.of(
                new AppUser("Owner", "owner@example.com", "existing-hash", Role.ADMIN)));
        setup(users, settings());
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void neverPromotesClientAndRefusesSecondOwnerOrInvalidSettings() {
        UserRepository users = mock(UserRepository.class);
        when(users.findByEmail("owner@example.com")).thenReturn(Optional.of(
                new AppUser("Client", "owner@example.com", "existing-hash", Role.CLIENT)));
        assertThrows(IllegalStateException.class, () -> setup(users, settings()));
        verify(users, never()).saveAndFlush(any());
        reset(users);
        when(users.findByEmail("owner@example.com")).thenReturn(Optional.empty());
        when(users.existsByRole(Role.ADMIN)).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> setup(users, settings()));
        verify(users, never()).saveAndFlush(any());
        assertThrows(IllegalStateException.class, () -> setup(users, new MockEnvironment()));
    }
}
