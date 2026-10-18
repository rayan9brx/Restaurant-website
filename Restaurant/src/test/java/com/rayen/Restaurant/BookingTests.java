package com.rayen.Restaurant;

import com.rayen.Restaurant.auth.*;
import com.rayen.Restaurant.booking.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"restaurant.booking.capacity=8", "spring.datasource.url=jdbc:h2:mem:restaurant-booking-tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"})
@ActiveProfiles("test")
class BookingTests {
    @Autowired WebApplicationContext context;
    @Autowired BookingRepository bookings;
    @Autowired UserRepository users;
    @Autowired BookingService service;
    MockMvc mvc;
    final LocalDate day=LocalDate.now(BookingSettings.ZONE).plusDays(7);
    @BeforeEach void setup(){
        mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        bookings.deleteAll();
        for(String email:List.of("booking@example.com","other@example.com"))
            if(users.findByEmail(email).isEmpty()) users.saveAndFlush(new AppUser("Booking Customer",email,"unused",Role.CLIENT));
    }
    @AfterEach void clean(){bookings.deleteAll();}
    BookingRequest request(int guests,LocalTime time,UUID key){return new BookingRequest("Customer","contact@example.com","+49 1234567",day,time,guests,"Window please",key);}
    String json(String date,String time,int guests,String key){return """
        {"name":"Customer","email":"contact@example.com","phone":"+49 1234567",
        "date":"%s","time":"%s","guests":%d,"specialRequests":"Window please","requestKey":"%s"}
        """.formatted(date,time,guests,key);}
    ResultActions create(String body) throws Exception {return mvc.perform(post("/api/reservations").with(user("booking@example.com")).with(csrf()).contentType("application/json").content(body));}
    @Test void persistsAndRetriesWithoutDuplicates() throws Exception {
        String body=json(day.toString(),"18:00",4,UUID.randomUUID().toString());
        create(body).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.reference").isNotEmpty()).andExpect(jsonPath("$.user").doesNotExist());
        create(body).andExpect(status().isCreated());
        assertEquals(1,bookings.count());
        var saved=bookings.findAll().getFirst();
        assertEquals("contact@example.com",saved.email); assertEquals("Window please",saved.specialRequests);
        assertNotNull(saved.createdAt); assertEquals(LocalTime.of(19,30),saved.endTime);
        mvc.perform(get("/api/reservations/mine").with(user("booking@example.com"))).andExpect(jsonPath("$[0].id").value(saved.id));
        mvc.perform(get("/api/reservations/mine").with(user("other@example.com"))).andExpect(jsonPath("$").isEmpty());
    }
    @Test void validatesDatesHoursGuestsAndContacts() throws Exception {
        for(String body:List.of(json(day.minusYears(2).toString(),"18:00",2,UUID.randomUUID().toString()),
            json(day.toString(),"11:00",2,UUID.randomUUID().toString()),json(day.toString(),"21:00",2,UUID.randomUUID().toString()),
            json(day.toString(),"18:15",2,UUID.randomUUID().toString()),json(day.toString(),"18:00",9,UUID.randomUUID().toString()),
            json(day.toString(),"18:00",0,UUID.randomUUID().toString()),json(day.toString(),"18:00",2,UUID.randomUUID().toString()).replace("contact@example.com","invalid"),
            json(day.toString(),"18:00",2,UUID.randomUUID().toString()).replace("Window please","x".repeat(501)))) {
            int status=create(body).andReturn().getResponse().getStatus(); assertTrue(status==400||status==409);
        }
        assertEquals(0,bookings.count());
        mvc.perform(get("/api/reservations/availability").param("date",day.toString()).param("guests","2")).andExpect(status().isOk());
    }
    @Test void enforcesAuthenticationCsrfAndAdmin() throws Exception {
        var body=json(day.toString(),"18:00",2,UUID.randomUUID().toString());
        mvc.perform(post("/api/reservations").with(csrf()).contentType("application/json").content(body)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/reservations").with(user("booking@example.com")).contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/reservations").with(user("booking@example.com"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/reservations").with(user("owner").roles("ADMIN"))).andExpect(status().isOk());
    }
    @Test void statusChangesReleaseCapacityAndEnforceOwnership() throws Exception {
        var b=service.create("booking@example.com",request(8,LocalTime.of(18,0),UUID.randomUUID()));
        create(json(day.toString(),"18:30",1,UUID.randomUUID().toString())).andExpect(status().isConflict());
        mvc.perform(post("/api/reservations/{id}/cancel",b.id).with(user("other@example.com")).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/reservations/{id}/status",b.id).with(user("booking@example.com")).with(csrf()).contentType("application/json").content("{\"status\":\"CONFIRMED\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/reservations/{id}/status",b.id).with(user("owner").roles("ADMIN")).with(csrf()).contentType("application/json").content("{\"status\":\"CONFIRMED\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CONFIRMED"));
        create(json(day.toString(),"18:00",1,UUID.randomUUID().toString())).andExpect(status().isConflict());
        mvc.perform(post("/api/reservations/{id}/cancel",b.id).with(user("booking@example.com")).with(csrf())).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        var second=service.create("booking@example.com",request(8,LocalTime.of(18,0),UUID.randomUUID()));
        service.change(second.id,"owner","REJECTED",true);
        assertDoesNotThrow(() -> service.create("booking@example.com",request(8,LocalTime.of(18,0),UUID.randomUUID())));
        mvc.perform(get("/api/admin/reservations").param("date",day.toString()).param("status","REJECTED").with(user("owner").roles("ADMIN")))
            .andExpect(jsonPath("$.length()").value(1));
    }
    @Test void concurrentRequestsCannotOverbook() throws Exception {
        ExecutorService pool=Executors.newFixedThreadPool(2);
        CountDownLatch start=new CountDownLatch(1);
        Callable<Boolean> task=() -> {start.await();try{service.create("booking@example.com",request(8,LocalTime.of(18,0),UUID.randomUUID()));return true;}catch(org.springframework.web.server.ResponseStatusException e){assertEquals(409,e.getStatusCode().value());return false;}};
        try {
            var a=pool.submit(task);var b=pool.submit(task);start.countDown();
            assertNotEquals(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS)); assertEquals(1,bookings.count());
        } finally {pool.shutdownNow();}
    }
    @Test void adjacentBookingsFitAndPastCancellationFails(){
        var b=service.create("booking@example.com",request(8,LocalTime.of(18,0),UUID.randomUUID()));
        assertDoesNotThrow(() -> service.create("booking@example.com",request(8,LocalTime.of(19,30),UUID.randomUUID())));
        b.date=day.minusYears(2);bookings.saveAndFlush(b);
        assertThrows(org.springframework.web.server.ResponseStatusException.class,() -> service.change(b.id,"booking@example.com","CANCELLED",false));
    }

    private Booking calendarBooking(LocalDate date, LocalTime time) {
        return service.create("booking@example.com", new BookingRequest("Calendar Customer",
                "calendar@example.com", "+49 1234567", date, time, 1, "Window please", UUID.randomUUID()));
    }

    @Test void calendarRangeIncludesBoundariesAndSortsByDateAndTime() throws Exception {
        LocalDate first = LocalDate.of(2032, 2, 28);
        LocalDate last = LocalDate.of(2032, 3, 1);
        calendarBooking(first.minusDays(1), LocalTime.of(18, 0));
        var end = calendarBooking(last, LocalTime.of(20, 0));
        var late = calendarBooking(first, LocalTime.of(19, 0));
        var early = calendarBooking(first, LocalTime.of(12, 0));
        var leap = calendarBooking(first.plusDays(1), LocalTime.of(18, 0));
        calendarBooking(last.plusDays(1), LocalTime.of(18, 0));

        mvc.perform(get("/api/admin/reservations").param("start", first.toString()).param("end", last.toString())
                .with(user("owner").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(4))
            .andExpect(jsonPath("$[0].id").value(early.id)).andExpect(jsonPath("$[1].id").value(late.id))
            .andExpect(jsonPath("$[2].id").value(leap.id)).andExpect(jsonPath("$[3].id").value(end.id));
        mvc.perform(get("/api/admin/reservations").param("start", last.toString()).param("end", last.toString())
                .with(user("owner").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        calendarBooking(LocalDate.of(2032, 12, 30), LocalTime.of(18, 0));
        calendarBooking(LocalDate.of(2032, 12, 31), LocalTime.of(18, 0));
        calendarBooking(LocalDate.of(2033, 1, 1), LocalTime.of(12, 0));
        calendarBooking(LocalDate.of(2033, 1, 2), LocalTime.of(12, 0));
        mvc.perform(get("/api/admin/reservations").param("start", "2032-12-31").param("end", "2033-01-01")
                .with(user("owner").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].date").value("2032-12-31"))
            .andExpect(jsonPath("$[1].date").value("2033-01-01"));
    }

    @Test void calendarRejectsBadRangesAndProtectsDetails() throws Exception {
        var booking = calendarBooking(day, LocalTime.of(18, 0));
        for (String url : List.of("/api/admin/reservations?start=2032-03-01&end=2032-02-28",
                "/api/admin/reservations?start=2032-03-01", "/api/admin/reservations?end=2032-03-01",
                "/api/admin/reservations?start=invalid&end=2032-03-01",
                "/api/admin/reservations?start=2032-03-01&end=2032-03-01&date=2032-03-01")) {
            mvc.perform(get(url).with(user("owner").roles("ADMIN"))).andExpect(status().isBadRequest());
        }
        for (String url : List.of("/api/admin/reservations?start=" + day + "&end=" + day,
                "/api/admin/reservations/" + booking.id)) {
            mvc.perform(get(url)).andExpect(status().isUnauthorized());
            mvc.perform(get(url).with(user("booking@example.com").roles("CLIENT")))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.email").doesNotExist());
        }
        mvc.perform(get("/api/admin/reservations/{id}", booking.id).with(user("owner").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.email").value("calendar@example.com"))
            .andExpect(jsonPath("$.phone").value("+49 1234567"))
            .andExpect(jsonPath("$.createdAt").exists()).andExpect(jsonPath("$.specialRequests").value("Window please"));
        mvc.perform(get("/api/admin/reservations/-1").with(user("owner").roles("ADMIN")))
            .andExpect(status().isNotFound());
        mvc.perform(get("/api/reservations/availability").param("date", day.toString()).param("guests", "2"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.email").doesNotExist())
            .andExpect(jsonPath("$.phone").doesNotExist()).andExpect(jsonPath("$.reservations").doesNotExist());
    }

    @Test void calendarUpdatesRefreshDetailsAndFiltersWithoutInvalidTransitions() throws Exception {
        var booking = calendarBooking(day, LocalTime.of(18, 0));
        String action = "/api/admin/reservations/" + booking.id + "/status";
        mvc.perform(post(action).with(user("owner").roles("ADMIN")).contentType("application/json")
                .content("{\"status\":\"CONFIRMED\"}")).andExpect(status().isForbidden());
        for (String invalid : List.of("PENDING", "CANCELLED", "UNKNOWN")) {
            mvc.perform(post(action).with(user("owner").roles("ADMIN")).with(csrf()).contentType("application/json")
                    .content("{\"status\":\"" + invalid + "\"}"))
                .andExpect(status().isConflict());
        }
        mvc.perform(post(action).with(user("owner").roles("ADMIN")).with(csrf()).contentType("application/json")
                .content("{\"status\":\"CONFIRMED\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CONFIRMED"));
        mvc.perform(get("/api/admin/reservations/{id}", booking.id).with(user("owner").roles("ADMIN")))
            .andExpect(jsonPath("$.status").value("CONFIRMED"));
        mvc.perform(get("/api/admin/reservations").param("start", day.toString()).param("end", day.toString())
                .param("status", "CONFIRMED").with(user("owner").roles("ADMIN")))
            .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/admin/reservations").param("start", day.toString()).param("end", day.toString())
                .param("status", "PENDING").with(user("owner").roles("ADMIN")))
            .andExpect(jsonPath("$").isEmpty());
        for (String invalid : List.of("REJECTED", "PENDING", "CANCELLED", "CONFIRMED")) {
            mvc.perform(post(action).with(user("owner").roles("ADMIN")).with(csrf()).contentType("application/json")
                    .content("{\"status\":\"" + invalid + "\"}"))
                .andExpect(status().isConflict());
        }
        assertEquals("CONFIRMED", bookings.findById(booking.id).orElseThrow().status);
        var rejected = calendarBooking(day, LocalTime.of(20, 0));
        mvc.perform(post("/api/admin/reservations/{id}/status", rejected.id)
                .with(user("owner").roles("ADMIN")).with(csrf()).contentType("application/json")
                .content("{\"status\":\"REJECTED\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));
        mvc.perform(get("/api/admin/reservations").param("start", day.toString()).param("end", day.toString())
                .param("status", "REJECTED").with(user("owner").roles("ADMIN")))
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value(rejected.id));
    }
}
