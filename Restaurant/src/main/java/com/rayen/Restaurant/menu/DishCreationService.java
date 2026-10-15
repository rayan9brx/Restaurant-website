package com.rayen.Restaurant.menu;

import com.rayen.Restaurant.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@Service
public class DishCreationService {
    private final DishRepository dishes;
    private final PhotoStorage photos;
    private final TransactionTemplate transactions;
    public DishCreationService(DishRepository dishes, PhotoStorage photos, TransactionTemplate transactions) {
        this.dishes = dishes; this.photos = photos; this.transactions = transactions;
    }
    public Dish create(DishRequest request, MultipartFile photo) throws IOException {
        String filename = photos.store(photo);
        try {
            // Include commit in the try block so a failed database write cleans up the file.
            return transactions.execute(status -> {
                Dish dish = new Dish();
                dish.setName(request.name().trim()); dish.setCategory(request.category());
                dish.setDescription(request.description().trim()); dish.setPrice(request.price());
                dish.setSalePrice(request.salePrice()); dish.setBestseller(Boolean.TRUE.equals(request.bestseller()));
                dish.setAvailable(request.available() == null || request.available());
                dish.setIngredients(request.ingredients()); dish.setAllergens(request.allergens());
                dish.setVegetarian(Boolean.TRUE.equals(request.vegetarian()) || Boolean.TRUE.equals(request.vegan()));
                dish.setVegan(Boolean.TRUE.equals(request.vegan())); dish.setPhoto(filename);
                return dishes.saveAndFlush(dish);
            });
        } catch (RuntimeException failure) {
            try { photos.remove(filename); } catch (IOException cleanup) { failure.addSuppressed(cleanup); }
            throw failure;
        }
    }
}
