package com.rayen.Restaurant.assistant;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/menu-assistant")
public class MenuAssistantController {
    private final MenuAssistantService service;
    private final AssistantLimits limits;
    public MenuAssistantController(MenuAssistantService service, AssistantLimits limits) {
        this.service = service; this.limits = limits;
    }
    @PostMapping("/chat")
    public MenuAssistantService.Answer chat(@Valid @RequestBody ChatRequest request, HttpServletRequest http) {
        // Do not trust client-supplied forwarding headers for rate-limit identity.
        limits.acquire(http.getRemoteAddr());
        try { return service.answer(request); }
        finally { limits.release(); }
    }
}
