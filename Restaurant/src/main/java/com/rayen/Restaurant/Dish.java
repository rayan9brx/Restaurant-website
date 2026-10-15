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

    private String photo;
    @Column(length = 2000)
    private String ingredients;
    @Column(length = 1000)
    private String allergens;
    private Boolean vegetarian;
    private Boolean vegan;
    @Column(precision = 10, scale = 2)
    private BigDecimal salePrice;
    private Boolean bestseller;

    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public Boolean getBestseller() { return bestseller; }
    public void setBestseller(Boolean bestseller) { this.bestseller = bestseller; }

    public String getPhotoUrl() { return photo == null ? null : "/api/dish-photos/" + photo; }
    public void setPhoto(String photo) { this.photo = photo; }
    public String getIngredients() { return ingredients; }
    public void setIngredients(String ingredients) { this.ingredients = ingredients; }
    public String getAllergens() { return allergens; }
    public void setAllergens(String allergens) { this.allergens = allergens; }
    public Boolean getVegetarian() { return vegetarian; }
    public void setVegetarian(Boolean vegetarian) { this.vegetarian = vegetarian; }
    public Boolean getVegan() { return vegan; }
    public void setVegan(Boolean vegan) { this.vegan = vegan; }

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
