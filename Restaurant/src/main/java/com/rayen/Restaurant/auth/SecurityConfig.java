package com.rayen.Restaurant.auth;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    UserDetailsService userDetailsService(UserRepository users) {
        return email -> {
            AppUser user = users.findByEmail(AppUser.normalizeEmail(email))
                    .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
            return User.withUsername(user.getEmail()).password(user.getPasswordHash())
                    .roles(user.getRole().name()).build();
        };
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // Keep default CSRF protection. React obtains a token before each POST.
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/dish-photos/*").permitAll()
                .requestMatchers("/api/dish-photos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/dishes", "/api/auth/csrf").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll())
            .requestCache(cache -> cache.disable())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) -> json(response, 401, "Please log in."))
                .accessDeniedHandler((request, response, exception) -> json(response, 403, "Access denied. Refresh the page and try again.")))
            // Spring handles password checks, session persistence and session ID rotation.
            .formLogin(form -> form.loginProcessingUrl("/api/auth/login").usernameParameter("email")
                .successHandler((request, response, authentication) -> json(response, 200, "Logged in."))
                .failureHandler((request, response, exception) -> json(response, 401, "Incorrect email or password.")))
            .logout(logout -> logout.logoutUrl("/api/auth/logout").deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) -> json(response, 200, "Logged out.")));
        return http.build();
    }

    private static void json(HttpServletResponse response, int status, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
