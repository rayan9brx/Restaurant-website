package com.rayen.Restaurant.auth;

import jakarta.validation.Validator;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "restaurant.owner.setup", havingValue = "true")
public class OwnerSetup implements ApplicationRunner {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final Environment environment;
    private final Validator validator;

    public OwnerSetup(UserRepository users, PasswordEncoder passwords, Environment environment, Validator validator) {
        this.users = users;
        this.passwords = passwords;
        this.environment = environment;
        this.validator = validator;
    }

    @Override @Transactional
    public void run(ApplicationArguments args) {
        RegistrationRequest owner = new RegistrationRequest(environment.getProperty("restaurant.owner.name"),
                environment.getProperty("restaurant.owner.email"), environment.getProperty("restaurant.owner.password"));
        if (!validator.validate(owner).isEmpty()) {
            throw new IllegalStateException("Owner setup requires valid name, email and password environment variables.");
        }
        AppUser existing = users.findByEmail(owner.email()).orElse(null);
        if (existing != null) {
            if (existing.getRole() == Role.ADMIN) return;
            // Never turn a registered customer into the owner.
            throw new IllegalStateException("Owner email belongs to a CLIENT. Choose a different owner email.");
        }
        if (users.existsByRole(Role.ADMIN)) {
            throw new IllegalStateException("An owner already exists. Disable owner setup.");
        }
        users.saveAndFlush(new AppUser(owner.name(), owner.email(), passwords.encode(owner.password()), Role.ADMIN));
    }
}
