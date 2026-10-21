package com.rayen.Restaurant.assistant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record ChatRequest(
        @NotBlank @Size(max = 600) String message,
        @NotNull @Size(max = 6) List<@NotNull @Valid Turn> history) {
    public record Turn(@NotBlank @Pattern(regexp = "user|assistant") String role,
                       @NotBlank @Size(max = 1200) String content) {}
}
