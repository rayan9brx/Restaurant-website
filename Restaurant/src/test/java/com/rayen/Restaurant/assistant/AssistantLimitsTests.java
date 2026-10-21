package com.rayen.Restaurant.assistant;

import org.junit.jupiter.api.Test;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;

class AssistantLimitsTests {
    static class MutableClock extends Clock {
        Instant value = Instant.parse("2026-10-21T12:00:00Z");
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return value; }
    }
    @Test void perAddressWindowExpiresAndCannotBypassGlobalLimit() {
        var clock = new MutableClock(); var limits = new AssistantLimits(clock);
        for (int i=0;i<6;i++) { limits.acquire("one"); limits.release(); }
        assertEquals(429, assertThrows(AssistantFailure.class, () -> limits.acquire("one")).getStatusCode().value());
        clock.value = clock.value.plusSeconds(61);
        assertDoesNotThrow(() -> limits.acquire("one")); limits.release();
        for (int i=7;i<120;i++) { limits.acquire("client"+i); limits.release(); }
        assertThrows(AssistantFailure.class, () -> limits.acquire("new-address"));
        clock.value = clock.value.plusSeconds(3601);
        assertDoesNotThrow(() -> limits.acquire("new-address")); limits.release();
    }
    @Test void capsConcurrentRequestsAndReleasesCapacity() {
        var limits = new AssistantLimits();
        limits.acquire("one"); limits.acquire("two");
        assertThrows(AssistantFailure.class, () -> limits.acquire("three"));
        limits.release(); assertDoesNotThrow(() -> limits.acquire("three"));
    }
}
