package com.rayen.Restaurant.menu;

import com.rayen.Restaurant.*;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/admin/dishes")
public class MenuManagementController {
    private final DishRepository dishes;
    private final DishCreationService creation;
    public MenuManagementController(DishRepository dishes, DishCreationService creation) {
        this.dishes = dishes; this.creation = creation;
    }
    @GetMapping public List<Dish> list() { return dishes.findAll(); }
    @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Dish create(@Valid @RequestPart("dish") DishRequest dish,
                       @RequestPart(value="photo", required=false) MultipartFile photo) throws IOException {
        return creation.create(dish, photo);
    }
}
