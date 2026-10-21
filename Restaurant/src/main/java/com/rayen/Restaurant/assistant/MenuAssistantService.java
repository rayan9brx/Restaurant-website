package com.rayen.Restaurant.assistant;

import com.rayen.Restaurant.Dish;
import com.rayen.Restaurant.DishRepository;
import com.rayen.Restaurant.booking.BookingSettings;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.regex.Pattern;
import static com.rayen.Restaurant.assistant.MenuAiProvider.Intent;

@Service
public class MenuAssistantService {
    private final DishRepository dishes;
    private final MenuAiProvider provider;
    private final BookingSettings booking;
    private final EntityManager entities;
    private final JsonMapper json = JsonMapper.builder().build();
    private static final Pattern EURO = Pattern.compile("(?:€\\s*(\\d{1,5}(?:[.,]\\d{1,2})?)|(\\d{1,5}(?:[.,]\\d{1,2})?)\\s*(?:€|euros?\\b))", Pattern.CASE_INSENSITIVE);
    private static final String ALLERGY_NOTE = "Recorded information may be incomplete. Confirm ingredients, allergens and cross-contact risks with restaurant staff before ordering. We cannot guarantee any dish is allergen-free.";

    public MenuAssistantService(DishRepository dishes, MenuAiProvider provider, BookingSettings booking, EntityManager entities) {
        this.dishes = dishes; this.provider = provider; this.booking = booking; this.entities = entities;
    }

    public record MenuItem(Long id, String name, BigDecimal price, String link, String description,
                           String ingredients, String allergens, Boolean vegetarian, Boolean vegan) {}
    public record Navigation(String label, String href) {}
    public record Answer(String message, List<MenuItem> dishes, BigDecimal total, List<Navigation> links) {}

    public Answer answer(ChatRequest request) {
        if (!provider.configured()) throw new AssistantFailure(HttpStatus.SERVICE_UNAVAILABLE, "Assistant is not configured yet");
        var page = dishes.findAll(PageRequest.of(0, 101));
        if (page.getTotalElements() > 100) throw new AssistantFailure(HttpStatus.SERVICE_UNAVAILABLE,
                "The menu is too large for the assistant. Please browse the menu directly.");
        var catalog = page.getContent().stream().filter(this::eligible).map(this::item).toList();
        String context = json.writeValueAsString(Map.of("restaurant", "Rayen Restaurant", "availableDishes", catalog,
                "booking", "Use /#booking. Log in to request a table. Requests need restaurant confirmation. Times use Europe/Berlin. Maximum guests: " + booking.getMaxPartySize(),
                "otherFacts", "No verified opening hours or contact details are provided to this assistant."));
        if (context.length() > 44000) throw new AssistantFailure(HttpStatus.SERVICE_UNAVAILABLE,
                "The menu is too large for the assistant. Please browse the menu directly.");
        var plan = provider.plan(context, request);
        if (plan == null || plan.intent() == null || plan.dishIds() == null || plan.dishIds().size() > 4
                || plan.dishIds().stream().anyMatch(Objects::isNull)) throw AssistantFailure.provider();
        if (plan.intent() == Intent.BOOKING) return plain("Choose your date, available time and guests in the booking form. Log in to send your request. Your table needs restaurant confirmation. Times are in Europe/Berlin; the configured maximum party size is "
                + booking.getMaxPartySize() + ". I cannot submit a booking for you.", new Navigation("Book a Table", "/#booking"));
        if (plan.intent() == Intent.INFO) return plain("I do not have verified opening hours or contact details. Check the site's contact section, or confirm with restaurant staff. Booking time slots are not verified opening hours.", new Navigation("About the restaurant", "/#about"));
        if (plan.intent() == Intent.OTHER) return plain("I can help you explore the recorded menu and explain how to request a table. I cannot make bookings, edit dishes, access customer records or take payments.", new Navigation("Explore Menu", "/#menu"));

        Set<Long> allowed = new HashSet<>(catalog.stream().map(MenuItem::id).toList());
        if (!allowed.containsAll(plan.dishIds())) throw AssistantFailure.provider();
        // Refresh after the network call: a sold-out, deleted or repriced dish must not use old data.
        // Clear this read-only request's JPA cache so the second query really reads current records.
        entities.clear();
        Map<Long, Dish> current = new HashMap<>();
        dishes.findAllById(plan.dishIds()).stream().filter(this::eligible).forEach(dish -> current.put(dish.getId(), dish));
        String question = request.message().toLowerCase(Locale.ROOT);
        boolean vegan = plan.intent() == Intent.VEGAN || question.contains("vegan");
        boolean vegetarian = plan.intent() == Intent.VEGETARIAN || question.contains("vegetarian") || question.contains("vegetarisch");
        boolean allergy = plan.intent() == Intent.ALLERGY || Pattern.compile("allerg|intoleran|ingredient|gluten|nut.free|dairy.free|celiac|coeliac", Pattern.CASE_INSENSITIVE).matcher(question).find();
        var selected = plan.dishIds().stream().distinct().map(current::get).filter(Objects::nonNull)
                .filter(dish -> !vegan || Boolean.TRUE.equals(dish.getVegan()))
                .filter(dish -> !vegetarian || Boolean.TRUE.equals(dish.getVegetarian()) || Boolean.TRUE.equals(dish.getVegan()))
                .map(this::item).toList();
        if (allergy) return new Answer("Here is recorded menu information, not a safety recommendation. " + ALLERGY_NOTE
                + (selected.isEmpty() ? " Please name an available dish to inspect its recorded details." : ""), selected, null, List.of());
        BigDecimal budget = euroBudget(request.message());
        if (plan.intent() == Intent.BUDGET && budget == null) {
            for (int i = request.history().size() - 1; i >= 0 && budget == null; i--)
                if (request.history().get(i).role().equals("user")) budget = euroBudget(request.history().get(i).content());
        }
        if (plan.intent() == Intent.BUDGET || budget != null) {
            if (budget == null || budget.signum() <= 0) return plain("Please give a euro budget, for example: Suggest a meal under €20.", new Navigation("Explore Menu", "/#menu"));
            BigDecimal total = selected.stream().map(MenuItem::price).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2);
            if (selected.isEmpty() || total.compareTo(budget) >= 0) return plain("I could not verify a suggested meal strictly under €" + budget.toPlainString()
                    + " using current available dishes. Try a different budget or browse the menu.", new Navigation("Explore Menu", "/#menu"));
            return new Answer("A meal under €" + budget.toPlainString() + ": one portion of each dish below. Total: €" + total.toPlainString()
                    + ". Prices reflect current menu records. Confirm allergy needs with restaurant staff.", selected, total, List.of());
        }
        return new Answer(selected.isEmpty() ? "I could not verify matching available dishes. Dietary suitability is shown only when recorded. Try another question or browse the menu."
                : "These available dishes match the recorded menu. Dietary labels use saved flags only. Confirm allergy needs with restaurant staff.", selected, null, List.of(new Navigation("Explore Menu", "/#menu")));
    }

    private Answer plain(String message, Navigation link) { return new Answer(message, List.of(), null, List.of(link)); }
    static BigDecimal euroBudget(String text) {
        var matcher = EURO.matcher(text);
        return matcher.find() ? new BigDecimal((matcher.group(1) == null ? matcher.group(2) : matcher.group(1)).replace(',', '.')).setScale(2) : null;
    }
    private boolean eligible(Dish dish) {
        return dish.getId() != null && dish.isAvailable() && dish.getName() != null && !dish.getName().isBlank()
                && dish.getPrice() != null && dish.getPrice().signum() > 0 && category(dish.getCategory()) != null;
    }
    private MenuItem item(Dish dish) {
        BigDecimal price = dish.getPrice();
        if (dish.getSalePrice() != null && dish.getSalePrice().signum() > 0 && dish.getSalePrice().compareTo(price) < 0) price = dish.getSalePrice();
        return new MenuItem(dish.getId(), snippet(dish.getName(), 255), price.setScale(2, RoundingMode.HALF_UP),
                "/menu/" + category(dish.getCategory()) + "#menu-dish-" + dish.getId(), snippet(dish.getDescription(), 300),
                snippet(dish.getIngredients(), 500), snippet(dish.getAllergens(), 500), dish.getVegetarian(), dish.getVegan());
    }
    private static String snippet(String value, int max) {
        if (value == null || value.isBlank()) return "Not recorded";
        return value.length() <= max ? value : value.substring(0, max) + "… (see menu for full recorded details)";
    }
    private String category(String value) {
        if (value == null) return null;
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "burger", "burgers" -> "burgers";
            case "pizza", "pizzas" -> "pizza";
            case "salad", "salads" -> "salads";
            case "drink", "drinks", "beverage", "beverages" -> "drinks";
            case "dessert", "desserts" -> "desserts";
            default -> null;
        };
    }
}
