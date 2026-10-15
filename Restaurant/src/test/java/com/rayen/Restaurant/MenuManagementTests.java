package com.rayen.Restaurant;

import com.rayen.Restaurant.menu.PhotoStorage;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MenuManagementTests {
    @TempDir static Path uploads;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("restaurant.upload-dir", () -> uploads.toString());
    }
    @Autowired WebApplicationContext context;
    @Autowired DishRepository dishes;
    @Autowired PhotoStorage storage;
    MockMvc mvc;
    final String valid = """
        {"name":"Test Dish", "category":"Burgers", "price":12.50,"description":"Fresh test dish",
        "ingredients":"Beans", "allergens":"Soy", "vegan":true}
        """;
    @BeforeEach void setup() { mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build(); }
    @AfterEach void cleanup() throws IOException {
        try (var files = Files.list(uploads)) { for (Path file : files.toList()) Files.delete(file); }
    }
    byte[] image(String format, int width, int height) throws IOException {
        var output = new ByteArrayOutputStream();
        assertTrue(ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), format, output));
        return output.toByteArray();
    }
    MockMultipartFile photo(byte[] content) { return new MockMultipartFile("photo", "../../unsafe.exe", "text/plain", content); }
    MockMultipartHttpServletRequestBuilder request(String json, MockMultipartFile photo) {
        var builder = multipart("/api/admin/dishes").file(new MockMultipartFile("dish", "", "application/json", json.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        if (photo != null) builder.file(photo);
        return builder;
    }
    @Test void createsAndPublishesDishWithoutChangingExistingRows() throws Exception {
        Dish original = new Dish(); original.setName("Existing"); original.setPrice(new java.math.BigDecimal("4.00"));
        original.setCategory("Pizza"); dishes.saveAndFlush(original);
        long count = dishes.count();
        var result = mvc.perform(request(valid, photo(image("png", 30, 20))).with(user("owner").roles("ADMIN")).with(csrf()))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Test Dish"))
            .andExpect(jsonPath("$.price").value(12.5)).andExpect(jsonPath("$.available").value(true))
            .andExpect(jsonPath("$.salePrice").isEmpty()).andExpect(jsonPath("$.bestseller").value(false))
            .andExpect(jsonPath("$.vegan").value(true)).andExpect(jsonPath("$.vegetarian").value(true))
            .andReturn();
        assertEquals(count + 1, dishes.count());
        assertEquals("Existing", dishes.findById(original.getId()).orElseThrow().getName());
        String url = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.photoUrl");
        assertTrue(url.matches("/api/dish-photos/[0-9a-f-]+\\.png"));
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
        mvc.perform(get("/api/dishes")).andExpect(status().isOk()).andExpect(jsonPath("$[?(@.name == 'Test Dish')].photoUrl").isNotEmpty());
    }
    @Test void acceptsJpegAndWebpAndSoldOut() throws Exception {
        byte[] webp = Base64.getDecoder().decode("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA");
        for (byte[] bytes : new byte[][] { image("jpeg", 10, 10), webp }) {
            mvc.perform(request(valid.replace("\"vegan\":true", "\"vegan\":false,\"available\":false"), photo(bytes))
                .with(user("owner").roles("ADMIN")).with(csrf()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.available").value(false));
        }
    }
    @Test void rejectsInvalidFieldsAndPrices() throws Exception {
        long count = dishes.count();
        mvc.perform(request("{\"name\":\" \",\"category\":\"Unknown\",\"price\":0,\"description\":\"\"}", photo(image("png", 2, 2)))
            .with(user("owner").roles("ADMIN")).with(csrf()))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.name").exists())
            .andExpect(jsonPath("$.errors.category").exists()).andExpect(jsonPath("$.errors.price").exists())
            .andExpect(jsonPath("$.errors.description").exists());
        for (String price : new String[] { "-1", "1.001", "100000000", "null", "\"invalid\"" }) {
            mvc.perform(request(valid.replace("12.50", price), photo(image("png", 2, 2)))
                .with(user("owner").roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
        }
        assertEquals(count, dishes.count());
        try (var files = Files.list(uploads)) { assertEquals(0, files.count()); }
    }
    @Test void rejectsMissingFakeUnsupportedOversizeAndExcessiveDimensionImages() throws Exception {
        long count = dishes.count();
        MockMultipartFile[] invalid = { null, photo(new byte[0]), photo("<script>alert(1)</script>".getBytes()),
            photo(image("gif", 2, 2)), photo(new byte[5 * 1024 * 1024 + 1]), photo(image("png", 6001, 1)),
            photo(image("png", 4001, 4000)), photo(java.util.Arrays.copyOf(image("png", 3, 3), 40)) };
        for (MockMultipartFile file : invalid) {
            mvc.perform(request(valid, file).with(user("owner").roles("ADMIN")).with(csrf()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.photo").exists());
        }
        assertEquals(count, dishes.count());
        try (var files = Files.list(uploads)) { assertEquals(0, files.count()); }
    }
    @Test void rejectsAnonymousClientsAndMissingCsrf() throws Exception {
        long count = dishes.count();
        mvc.perform(request(valid, photo(image("png", 2, 2))).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(request(valid, photo(image("png", 2, 2))).with(user("client").roles("CLIENT")).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(request(valid, photo(image("png", 2, 2))).with(user("owner").roles("ADMIN"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/dishes")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/dishes").with(user("client").roles("CLIENT"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/dishes").with(user("owner").roles("ADMIN"))).andExpect(status().isOk());
        mvc.perform(get("/api/dish-photos/anything.png")).andExpect(status().isNotFound());
        mvc.perform(post("/api/dish-photos/anything.png").with(user("client").roles("CLIENT")).with(csrf())).andExpect(status().isForbidden());
        assertEquals(count, dishes.count());
    }

    @Test void removesPhotoWhenDatabaseSaveFails() throws Exception {
        var failingRepository = org.mockito.Mockito.mock(DishRepository.class);
        org.mockito.Mockito.when(failingRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(Dish.class)))
            .thenThrow(new org.springframework.dao.DataIntegrityViolationException("Test database failure"));
        var transactions = context.getBean(org.springframework.transaction.support.TransactionTemplate.class);
        var creation = new com.rayen.Restaurant.menu.DishCreationService(failingRepository, storage, transactions);
        var request = new com.rayen.Restaurant.menu.DishRequest("Test", "Pizza", new java.math.BigDecimal("1.00"), "Test description", true, null, null, false, false, null, false);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
            () -> creation.create(request, photo(image("png", 2, 2))));
        try (var files = Files.list(uploads)) { assertEquals(0, files.count()); }
    }

    @Test void persistsSaleAndBestsellerAndReturnsThemToCustomers() throws Exception {
        var json = valid.replace("\"vegan\":true", "\"vegan\":true,\"salePrice\":9.99,\"bestseller\":true");
        var result = mvc.perform(request(json, photo(image("png", 2, 2))).with(user("owner").roles("ADMIN")).with(csrf()))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.price").value(12.5))
            .andExpect(jsonPath("$.salePrice").value(9.99)).andExpect(jsonPath("$.bestseller").value(true)).andReturn();
        Number id = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        var saved = dishes.findById(id.longValue()).orElseThrow();
        assertEquals(0, new java.math.BigDecimal("9.99").compareTo(saved.getSalePrice()));
        assertTrue(saved.getBestseller());
        mvc.perform(get("/api/dishes")).andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.id == " + id + ")].salePrice").value(org.hamcrest.Matchers.hasItem(9.99)))
            .andExpect(jsonPath("$[?(@.id == " + id + ")].bestseller").value(org.hamcrest.Matchers.hasItem(true)));
    }

    @Test void rejectsInvalidSalePricesBeforeSaving() throws Exception {
        long count = dishes.count();
        for (String sale : new String[] { "0", "-1", "12.50", "15", "1.001", "100000000" }) {
            String json = valid.replace("\"vegan\":true", "\"vegan\":true,\"salePrice\":" + sale);
            mvc.perform(request(json, photo(image("png", 2, 2))).with(user("owner").roles("ADMIN")).with(csrf()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.salePrice").exists());
        }
        assertEquals(count, dishes.count());
        try (var files = Files.list(uploads)) { assertEquals(0, files.count()); }
    }

    @Test void deleteRemovesOnlySelectedDishAndKeepsSharedPhoto() throws Exception {
        Dish removed = existingDish(true);
        String photoUrl = removed.getPhotoUrl();
        Dish retained = existingDish(false);
        retained.setPhoto(photoUrl.substring(photoUrl.lastIndexOf('/') + 1)); dishes.saveAndFlush(retained);
        long count = dishes.count();
        mvc.perform(delete("/api/admin/dishes/{id}", removed.getId()).with(user("owner").roles("ADMIN")).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.message").value("Dish deleted."));
        assertEquals(count - 1, dishes.count());
        assertFalse(dishes.existsById(removed.getId()));
        assertEquals(photoUrl, dishes.findById(retained.getId()).orElseThrow().getPhotoUrl());
        mvc.perform(get(photoUrl)).andExpect(status().isOk());
        mvc.perform(get("/api/dishes")).andExpect(jsonPath("$[?(@.id == " + removed.getId() + ")]").isEmpty());
    }

    @Test void deleteMissingDishReturns404() throws Exception {
        long count = dishes.count();
        mvc.perform(delete("/api/admin/dishes/-1").with(user("owner").roles("ADMIN")).with(csrf()))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").exists());
        assertEquals(count, dishes.count());
    }

    @Test void deleteDeniesAnonymousClientsAndMissingCsrf() throws Exception {
        Dish original = existingDish(true);
        mvc.perform(delete("/api/admin/dishes/{id}", original.getId()).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/admin/dishes/{id}", original.getId()).with(user("client").roles("CLIENT")).with(csrf()))
            .andExpect(status().isForbidden());
        mvc.perform(delete("/api/admin/dishes/{id}", original.getId()).with(user("owner").roles("ADMIN")))
            .andExpect(status().isForbidden());
        assertTrue(dishes.existsById(original.getId()));
    }

    Dish existingDish(boolean withPhoto) throws IOException {
        Dish dish = new Dish();
        dish.setName("Original dish"); dish.setCategory("Burgers");
        dish.setDescription("Original description"); dish.setPrice(new java.math.BigDecimal("12.50"));
        if (withPhoto) dish.setPhoto(storage.store(photo(image("png", 3, 3))));
        return dishes.saveAndFlush(dish);
    }

    MockMultipartHttpServletRequestBuilder update(Long id, String json, MockMultipartFile photo) {
        var builder = multipart(org.springframework.http.HttpMethod.PUT, "/api/admin/dishes/{id}", id)
            .file(new MockMultipartFile("dish", "", "application/json", json.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        if (photo != null) builder.file(photo);
        return builder;
    }

    @Test void updatesAllFieldsAndCategoryWithoutChangingIdOrPhoto() throws Exception {
        Dish original = existingDish(true);
        long count = dishes.count();
        String oldUrl = original.getPhotoUrl();
        String json = """
            {"name":"Updated dish", "category":"Salads", "price":11.00, "salePrice":8.75,
            "description":"Updated description", "ingredients":"Chickpeas", "allergens":"Sesame",
            "available":false, "vegetarian":true, "vegan":true, "bestseller":true}
            """;
        mvc.perform(update(original.getId(), json, null).with(user("owner").roles("ADMIN")).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(original.getId()))
            .andExpect(jsonPath("$.name").value("Updated dish")).andExpect(jsonPath("$.category").value("Salads"))
            .andExpect(jsonPath("$.description").value("Updated description"))
            .andExpect(jsonPath("$.price").value(11.0)).andExpect(jsonPath("$.salePrice").value(8.75))
            .andExpect(jsonPath("$.ingredients").value("Chickpeas")).andExpect(jsonPath("$.allergens").value("Sesame"))
            .andExpect(jsonPath("$.available").value(false)).andExpect(jsonPath("$.vegan").value(true))
            .andExpect(jsonPath("$.vegetarian").value(true)).andExpect(jsonPath("$.bestseller").value(true))
            .andExpect(jsonPath("$.photoUrl").value(oldUrl));
        assertEquals(count, dishes.count());
        mvc.perform(get(oldUrl)).andExpect(status().isOk());
        mvc.perform(get("/api/dishes")).andExpect(jsonPath("$[?(@.id == " + original.getId() + ")].category")
            .value(org.hamcrest.Matchers.hasItem("Salads")));
    }

    @Test void replacesPhotoAndRetainsFilesSharedByOtherDishes() throws Exception {
        Dish original = existingDish(true);
        String oldUrl = original.getPhotoUrl();
        Dish shared = existingDish(false);
        shared.setPhoto(oldUrl.substring(oldUrl.lastIndexOf('/') + 1)); dishes.saveAndFlush(shared);
        var result = mvc.perform(update(original.getId(), valid, photo(image("jpeg", 8, 8)))
            .with(user("owner").roles("ADMIN")).with(csrf())).andExpect(status().isOk()).andReturn();
        String newUrl = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.photoUrl");
        assertNotEquals(oldUrl, newUrl);
        assertEquals(oldUrl, dishes.findById(shared.getId()).orElseThrow().getPhotoUrl());
        mvc.perform(get(oldUrl)).andExpect(status().isOk());
        mvc.perform(get(newUrl)).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
    }

    @Test void updatesLegacyDishWithoutRequiringPhotoAndClearsOptionalFields() throws Exception {
        Dish original = existingDish(false);
        original.setSalePrice(new java.math.BigDecimal("8.00")); original.setBestseller(true);
        original.setVegan(true); original.setVegetarian(true); original.setIngredients("Old ingredients");
        original.setAllergens("Old allergens"); dishes.saveAndFlush(original);
        String json = """
            {"name":"Legacy updated", "category":"Pizza", "price":9.50, "description":"Updated",
            "salePrice":null,"bestseller":false,"vegan":false,"vegetarian":false,
            "ingredients":"", "allergens":"", "available":true}
            """;
        mvc.perform(update(original.getId(), json, null).with(user("owner").roles("ADMIN")).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.photoUrl").isEmpty())
            .andExpect(jsonPath("$.salePrice").isEmpty()).andExpect(jsonPath("$.bestseller").value(false))
            .andExpect(jsonPath("$.vegan").value(false)).andExpect(jsonPath("$.vegetarian").value(false))
            .andExpect(jsonPath("$.ingredients").value("")).andExpect(jsonPath("$.allergens").value(""));
    }

    @Test void invalidUpdateOrReplacementKeepsOriginalRecordAndPhoto() throws Exception {
        Dish original = existingDish(true);
        String oldUrl = original.getPhotoUrl();
        for (String json : new String[] { valid.replace("12.50", "0"), valid.replace("Burgers", "Unknown"),
            valid.replace("Test Dish", " "), valid.replace("Fresh test dish", ""),
            valid.replace("12.50", "1.001"), valid.replace("\"vegan\":true", "\"salePrice\":20") }) {
            mvc.perform(update(original.getId(), json, photo(image("png", 2, 2)))
                .with(user("owner").roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
        }
        for (MockMultipartFile invalid : new MockMultipartFile[] { photo(new byte[0]), photo("fake image".getBytes()),
            photo(new byte[5 * 1024 * 1024 + 1]), photo(image("png", 6001, 1)) }) {
            mvc.perform(update(original.getId(), valid, invalid).with(user("owner").roles("ADMIN")).with(csrf()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.photo").exists());
        }
        assertEquals("Original dish", dishes.findById(original.getId()).orElseThrow().getName());
        assertEquals(oldUrl, dishes.findById(original.getId()).orElseThrow().getPhotoUrl());
        mvc.perform(get(oldUrl)).andExpect(status().isOk());
        try (var files = Files.list(uploads)) { assertEquals(1, files.count()); }
    }

    @Test void updateMissingDishReturnsClear404WithoutStoringPhoto() throws Exception {
        long count = dishes.count();
        mvc.perform(update(-1L, valid, photo(image("png", 2, 2))).with(user("owner").roles("ADMIN")).with(csrf()))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("This dish no longer exists. Refresh the dish list."));
        assertEquals(count, dishes.count());
        try (var files = Files.list(uploads)) { assertEquals(0, files.count()); }
    }

    @Test void updateDeniesAnonymousClientsAndMissingCsrf() throws Exception {
        Dish original = existingDish(true);
        mvc.perform(update(original.getId(), valid, null).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(update(original.getId(), valid, photo(image("png", 2, 2))).with(user("client").roles("CLIENT")).with(csrf()))
            .andExpect(status().isForbidden());
        mvc.perform(update(original.getId(), valid, null).with(user("owner").roles("ADMIN"))).andExpect(status().isForbidden());
        assertEquals("Original dish", dishes.findById(original.getId()).orElseThrow().getName());
        try (var files = Files.list(uploads)) { assertEquals(1, files.count()); }
    }

    @Test
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void failedDatabaseUpdateRollsBackRecordAndKeepsOldPhoto() throws Exception {
        Dish original = existingDish(true);
        String oldUrl = original.getPhotoUrl();
        try {
            var failingRepository = org.mockito.Mockito.mock(DishRepository.class);
            org.mockito.Mockito.when(failingRepository.existsById(original.getId())).thenReturn(true);
            org.mockito.Mockito.when(failingRepository.findById(original.getId())).thenAnswer(call -> dishes.findById(original.getId()));
            org.mockito.Mockito.when(failingRepository.saveAndFlush(org.mockito.ArgumentMatchers.any(Dish.class))).thenAnswer(call -> {
                dishes.saveAndFlush(call.getArgument(0));
                throw new org.springframework.dao.DataIntegrityViolationException("Simulated failure after flush");
            });
            var service = new com.rayen.Restaurant.menu.DishCreationService(failingRepository, storage,
                context.getBean(org.springframework.transaction.support.TransactionTemplate.class));
            var request = new com.rayen.Restaurant.menu.DishRequest("Changed", "Pizza", new java.math.BigDecimal("5.00"), "Changed", true, null, null, false, false, null, false);
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> service.update(original.getId(), request, photo(image("png", 2, 2))));
            var unchanged = dishes.findById(original.getId()).orElseThrow();
            assertEquals("Original dish", unchanged.getName());
            assertEquals(oldUrl, unchanged.getPhotoUrl());
            mvc.perform(get(oldUrl)).andExpect(status().isOk());
            try (var files = Files.list(uploads)) { assertEquals(1, files.count()); }
        } finally { dishes.deleteById(original.getId()); }
    }
}
