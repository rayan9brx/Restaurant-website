package com.rayen.Restaurant.menu;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record DishRequest(
    @NotBlank(message="Enter a dish name.") @Size(max=255, message="Use at most 255 characters.") String name,
    @NotBlank(message="Choose a category.") @Pattern(regexp="Burgers|Pizza|Salads|Drinks|Desserts", message="Choose an existing category.") String category,
    @NotNull(message="Enter a price.") @DecimalMin(value="0", inclusive=false, message="Price must be greater than zero.")
    @Digits(integer=8, fraction=2, message="Use at most 8 digits and 2 decimal places.") BigDecimal price,
    @NotBlank(message="Enter a description.") @Size(max=1000, message="Use at most 1000 characters.") String description,
    Boolean available,
    @Size(max=2000, message="Use at most 2000 characters.") String ingredients,
    @Size(max=1000, message="Use at most 1000 characters.") String allergens,
    Boolean vegetarian, Boolean vegan,
    @DecimalMin(value="0", inclusive=false, message="Sale price must be greater than zero.")
    @Digits(integer=8, fraction=2, message="Use at most 8 digits and 2 decimal places.") BigDecimal salePrice,
    Boolean bestseller
) {
    @AssertTrue(message="Sale price must be lower than the regular price.")
    public boolean isSalePriceBelowRegular() {
        return salePrice == null || price == null || salePrice.compareTo(price) < 0;
    }
}
