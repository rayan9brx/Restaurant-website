package com.rayen.Restaurant.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final RegistrationService registration;
    private final UserRepository users;

    public AuthController(RegistrationService registration, UserRepository users) {
        this.registration = registration;
        this.users = users;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }

    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public UserDetailsResponse register(@Valid @RequestBody RegistrationRequest request) {
        return registration.register(request);
    }

    @GetMapping("/me")
    public UserDetailsResponse currentUser(Authentication authentication) {
        return UserDetailsResponse.from(users.findByEmail(authentication.getName()).orElseThrow());
    }
}
