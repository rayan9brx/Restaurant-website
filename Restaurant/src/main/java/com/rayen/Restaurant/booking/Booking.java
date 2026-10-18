package com.rayen.Restaurant.booking;

import com.rayen.Restaurant.auth.AppUser;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="reservations", uniqueConstraints=@UniqueConstraint(columnNames={"user_id", "requestKey"}))
public class Booking {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @JsonIgnore @ManyToOne(optional=false) @JoinColumn(name="user_id") public AppUser user;
    @Column(nullable=false, length=100) public String name;
    @Column(nullable=false, length=254) public String email;
    @Column(nullable=false, length=30) public String phone;
    @Column(nullable=false) public LocalDate date;
    @Column(nullable=false) public LocalTime time;
    @Column(nullable=false) public LocalTime endTime;
    @Column(nullable=false) public int guests;
    @Column(length=500) public String specialRequests;
    @Column(nullable=false, length=12) public String status;
    @Column(nullable=false, unique=true, length=36) public String reference;
    @JsonIgnore @Column(nullable=false, length=36) public String requestKey;
    @Column(nullable=false) public Instant createdAt;
}
