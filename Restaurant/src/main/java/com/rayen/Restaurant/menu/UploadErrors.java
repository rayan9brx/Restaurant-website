package com.rayen.Restaurant.menu;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import java.util.Map;

@RestControllerAdvice
public class UploadErrors {
    // Oversized requests can fail before Spring selects a controller.
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> tooLarge() {
        return ResponseEntity.status(413).body(Map.of("message", "Photo must be at most 5 MB.",
            "errors", Map.of("photo", "Photo must be at most 5 MB.")));
    }
}
