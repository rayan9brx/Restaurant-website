package com.rayen.Restaurant;

import org.springframework.data.jpa.repository.JpaRepository;

// Provides database operations such as findAll() and save().
public interface DishRepository extends JpaRepository<Dish, Long> {
}