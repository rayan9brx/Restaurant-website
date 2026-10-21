INSERT INTO dishes (name, description, price, category, available, ingredients, allergens, vegetarian, vegan, bestseller) VALUES
('Margherita Pizza', 'Tomato, mozzarella and basil', 9.90, 'Pizza', true, 'Tomato, mozzarella, basil, pizza dough', 'Gluten, milk', true, false, true),
('Beef Burger', 'Beef patty, lettuce, tomato and cheese', 12.50, 'Burgers', true, 'Beef, lettuce, tomato, cheese, brioche bun', 'Gluten, milk, egg', false, false, true),
('Garden Salad', 'Crisp greens, cherry tomatoes and a light house dressing', 8.50, 'Salads', true, 'Mixed greens, cucumber, tomatoes, olive oil', '', true, true, false),
('Chocolate Dessert', 'Rich chocolate cake with a soft centre', 6.50, 'Desserts', true, 'Chocolate, flour, butter, eggs', 'Gluten, milk, egg', true, false, false),
('Fresh Lemonade', 'A refreshing blend of lemon, sparkling water and mint', 4.00, 'Drinks', true, 'Lemon, sparkling water, mint', '', true, true, false);
INSERT INTO users (name, email, password_hash, role, created_at) VALUES ('Demo Guest', 'guest@example.com', 'no-login-for-seeded-demo-guest', 'CLIENT', CURRENT_TIMESTAMP);
INSERT INTO reservations (user_id, name, email, phone, date, time, end_time, guests, special_requests, status, reference, request_key, created_at) VALUES
(1, 'Alex Morgan (Demo)', 'alex.morgan@example.com', '+1 202-555-0101', DATE '2026-10-20', TIME '18:00:00', TIME '19:30:00', 4, 'Fictional portfolio reservation. A quiet table, please.', 'PENDING', 'DEMO-OCT20-A', 'demo-request-1', CURRENT_TIMESTAMP),
(1, 'Jamie Taylor (Demo)', 'jamie.taylor@example.com', '+1 202-555-0102', DATE '2026-10-20', TIME '19:00:00', TIME '20:30:00', 2, 'Fictional portfolio reservation.', 'CONFIRMED', 'DEMO-OCT20-B', 'demo-request-2', CURRENT_TIMESTAMP),
(1, 'Sam Rivera (Demo)', 'sam.rivera@example.com', '+1 202-555-0103', DATE '2026-10-22', TIME '18:30:00', TIME '20:00:00', 6, 'Fictional portfolio reservation.', 'PENDING', 'DEMO-OCT22-A', 'demo-request-3', CURRENT_TIMESTAMP),
(1, 'Jordan Lee (Demo)', 'jordan.lee@example.com', '+1 202-555-0104', DATE '2026-10-24', TIME '17:00:00', TIME '18:30:00', 3, 'Fictional portfolio reservation.', 'CONFIRMED', 'DEMO-OCT24-A', 'demo-request-4', CURRENT_TIMESTAMP),
(1, 'Casey Brooks (Demo)', 'casey.brooks@example.com', '+1 202-555-0105', DATE '2026-10-26', TIME '19:30:00', TIME '21:00:00', 5, 'Fictional portfolio reservation.', 'PENDING', 'DEMO-OCT26-A', 'demo-request-5', CURRENT_TIMESTAMP);
