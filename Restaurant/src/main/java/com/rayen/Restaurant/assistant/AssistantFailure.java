package com.rayen.Restaurant.assistant;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class AssistantFailure extends ResponseStatusException {
    public AssistantFailure(HttpStatus status, String message) { super(status, message); }
    static AssistantFailure provider() {
        return new AssistantFailure(HttpStatus.BAD_GATEWAY, "The assistant could not answer right now. Please retry.");
    }
}
