package com.rayen.Restaurant;

import jakarta.persistence.*;
import java.math.BigDecimal;

// Maps this class to the dishes table.
@Entity
@Table(name = "dishes")
public class Dish {

    // PostgreSQL generates a unique ID for each dish.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String description;

    // BigDecimal stores monetary values precisely.
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    private String category;

    private boolean available = true;

    // JPA needs a constructor without arguments.
    public Dish() {
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public boolean isAvailable() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }
}