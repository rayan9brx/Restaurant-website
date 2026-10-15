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
}
