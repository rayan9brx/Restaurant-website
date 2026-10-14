package com.rayen.Restaurant.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {
    private final UserRepository users;
    private final PasswordEncoder passwords;

    public RegistrationService(UserRepository users, PasswordEncoder passwords) {
        this.users = users;
        this.passwords = passwords;
    }

    @Transactional
    public UserDetailsResponse register(RegistrationRequest request) {
        if (users.existsByEmail(request.email())) throw new DuplicateEmailException();
        // Public requests never choose a role. Every new customer is CLIENT.
        return UserDetailsResponse.from(users.saveAndFlush(new AppUser(
                request.name(), request.email(), passwords.encode(request.password()), Role.CLIENT)));
    }

    public static class DuplicateEmailException extends RuntimeException { }
}
