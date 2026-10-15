package com.rayen.Restaurant.menu;

import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class DishPhotoController {
    private final PhotoStorage photos;
    public DishPhotoController(PhotoStorage photos) { this.photos = photos; }
    @GetMapping("/api/dish-photos/{filename}")
    public ResponseEntity<?> photo(@PathVariable String filename) {
        var path = photos.find(filename);
        if (path == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG)
            .header("X-Content-Type-Options", "nosniff")
            .cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(1)))
            .body(new FileSystemResource(path));
    }
}
