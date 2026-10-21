package com.rayen.Restaurant.assistant;

import java.util.List;

/** Provider-independent boundary: the AI selects records, never writes restaurant facts. */
public interface MenuAiProvider {
    boolean configured();
    Plan plan(String context, ChatRequest request);

    enum Intent { RECOMMEND, VEGETARIAN, VEGAN, BUDGET, ALLERGY, BOOKING, INFO, OTHER }
    record Plan(Intent intent, List<Long> dishIds) {}
}
