package com.rayen.Restaurant.assistant;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestControllerAdvice(assignableTypes = MenuAssistantController.class)
public class AssistantErrors {
    @ExceptionHandler(AssistantFailure.class)
    ResponseEntity<?> failure(AssistantFailure failure) {
        return ResponseEntity.status(failure.getStatusCode()).body(Map.of("message", failure.getReason()));
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    ResponseEntity<?> invalid() {
        return ResponseEntity.badRequest().body(Map.of("message", "Use a message of 1–600 characters and at most six history entries of 1–1200 characters each."));
    }
}
