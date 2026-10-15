package com.rayen.Restaurant.menu;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.*;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import java.io.IOException;
import java.util.*;

@RestControllerAdvice(assignableTypes=MenuManagementController.class)
public class MenuErrors {
    @ExceptionHandler(DishNotFoundException.class)
    public ResponseEntity<?> missing() {
        return ResponseEntity.status(404).body(Map.of("message", "This dish no longer exists. Refresh the dish list."));
    }
    @ExceptionHandler(DishInputException.class)
    public ResponseEntity<?> input(DishInputException error) { return bad(error.errors); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validation(MethodArgumentNotValidException error) {
        Map<String, String> fields = new LinkedHashMap<>();
        error.getBindingResult().getFieldErrors().forEach(field -> {
            String name = field.getField().equals("salePriceBelowRegular") ? "salePrice" : field.getField();
            fields.putIfAbsent(name, field.getDefaultMessage());
        });
        return bad(fields);
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> malformedDetails() {
        return ResponseEntity.badRequest().body(Map.of("message", "Send valid dish details, including a numeric price and true/false options."));
    }
    @ExceptionHandler({MissingServletRequestPartException.class, MultipartException.class})
    public ResponseEntity<?> malformedUpload() {
        return ResponseEntity.badRequest().body(Map.of("message", "Send dish details and a photo together. Please choose your photo again."));
    }
    @ExceptionHandler({IOException.class, org.springframework.dao.DataAccessException.class})
    public ResponseEntity<?> unavailable() {
        return ResponseEntity.internalServerError().body(Map.of("message", "Could not save the dish. Please try again."));
    }
    private ResponseEntity<?> bad(Map<String, String> fields) {
        return ResponseEntity.badRequest().body(Map.of("message", "Please check the dish details.", "errors", fields));
    }
}
