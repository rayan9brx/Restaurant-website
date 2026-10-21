package com.rayen.Restaurant.assistant;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import java.time.Clock;
import java.util.HashMap;
import java.util.Map;

@Component
public class AssistantLimits {
    private final Clock clock;
    private final Map<String, Window> clients = new HashMap<>();
    private Window global;
    private int active;
    public AssistantLimits() { this(Clock.systemUTC()); }
    AssistantLimits(Clock clock) { this.clock = clock; global = new Window(clock.millis()); }

    public synchronized void acquire(String address) {
        long now = clock.millis();
        clients.entrySet().removeIf(entry -> now - entry.getValue().start >= 60000);
        if (now - global.start >= 3600000) global = new Window(now);
        if (active >= 2 || global.count >= 120 || clients.size() >= 4096 && !clients.containsKey(address)) limited();
        var client = clients.computeIfAbsent(address, ignored -> new Window(now));
        if (client.count >= 6) limited();
        client.count++; global.count++; active++;
    }
    public synchronized void release() { active = Math.max(0, active - 1); }
    private void limited() { throw new AssistantFailure(HttpStatus.TOO_MANY_REQUESTS,
            "The assistant has reached its usage limit. Please try again later or browse the menu."); }
    private static class Window {
        final long start;
        int count;
        Window(long start) { this.start = start; }
    }
}
