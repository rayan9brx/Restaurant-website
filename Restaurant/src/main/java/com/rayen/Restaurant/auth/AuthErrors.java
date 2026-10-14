package com.rayen.Restaurant.auth;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthErrors {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validation(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error -> {
            String field = error.getField().equals("passwordWithinByteLimit") ? "password" : error.getField();
            fields.putIfAbsent(field, error.getDefaultMessage());
        });
        return ResponseEntity.badRequest().body(Map.of("message", "Please check your details.", "errors", fields));
    }

    @ExceptionHandler({RegistrationService.DuplicateEmailException.class, DataIntegrityViolationException.class})
    public ResponseEntity<?> duplicate() {
        // The database constraint also catches simultaneous sign-ups with the same email.
        return ResponseEntity.status(409).body(Map.of("message", "An account with this email already exists.",
                "errors", Map.of("email", "This email is already registered.")));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> invalidJson() {
        return ResponseEntity.badRequest().body(Map.of("message", "Please send valid registration details."));
    }
}
