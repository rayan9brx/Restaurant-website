package com.rayen.Restaurant.booking;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;

@Component
@ConfigurationProperties(prefix = "restaurant.booking")
public class BookingSettings {
    public static final ZoneId ZONE = ZoneId.of("Europe/Berlin");
    private LocalTime opens = LocalTime.of(12, 0);
    private LocalTime closes = LocalTime.of(22, 0);
    private int intervalMinutes = 30;
    private int durationMinutes = 90;
    private int maxPartySize = 8;
    private int capacity = 40;
    private Set<DayOfWeek> closedDays = new HashSet<>();

    public LocalTime getOpens() { return opens; }
    public void setOpens(LocalTime opens) { this.opens = opens; }

    public LocalTime getCloses() { return closes; }
    public void setCloses(LocalTime closes) { this.closes = closes; }

    public int getIntervalMinutes() { return intervalMinutes; }
    public void setIntervalMinutes(int intervalMinutes) { this.intervalMinutes = intervalMinutes; }

    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }

    public int getMaxPartySize() { return maxPartySize; }
    public void setMaxPartySize(int maxPartySize) { this.maxPartySize = maxPartySize; }

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }

    public Set<DayOfWeek> getClosedDays() { return closedDays; }
    public void setClosedDays(Set<DayOfWeek> closedDays) { this.closedDays = closedDays; }

    @PostConstruct
    void validate() {
        long openMinutes = Duration.between(opens, closes).toMinutes();
        if (!opens.isBefore(closes) || intervalMinutes < 1 || durationMinutes < 1 ||
                durationMinutes > openMinutes || maxPartySize < 1 || capacity < maxPartySize) {
            throw new IllegalStateException("Invalid restaurant.booking settings");
        }
    }
}
