package com.rayen.Restaurant;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// Handles web requests and returns responses directly.
@RestController
public class HelloController {

    @GetMapping("/api/hello")
    public String hello() {
        return "Restaurant backend is working!";
    }
}