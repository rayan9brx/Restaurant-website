package com.rayen.Restaurant.menu;

import java.util.Map;

public class DishInputException extends RuntimeException {
    final Map<String, String> errors;
    public DishInputException(String field, String message) {
        super(message);
        errors = Map.of(field, message);
    }
}
