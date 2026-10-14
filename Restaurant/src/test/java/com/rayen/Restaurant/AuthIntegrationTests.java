package com.rayen.Restaurant;

import com.jayway.jsonpath.JsonPath;
import com.rayen.Restaurant.auth.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class AuthIntegrationTests {
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired JdbcTemplate jdbc;
    MockMvc mvc;

    @BeforeEach
    void prepare() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        users.deleteAll();
    }

    private ResultActions register(String body) throws Exception {
        return mvc.perform(post("/api/auth/register").with(csrf()).contentType("application/json").content(body));
    }

    private void customer() throws Exception {
        register("""
                {"name":"Rayen", "email":"rayen@example.com", "password":"test-password-123"}
                """).andExpect(status().isCreated());
    }

    @Test
    void registrationPersistsNormalizedClientAndHashEvenWithForgedRole() throws Exception {
        register("""
                {"name":" Rayen ", "email":" RAYEN@Example.COM ", "password":"test-password-123", "role":"ADMIN"}
                """).andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("CLIENT"))
                .andExpect(jsonPath("$.email").value("rayen@example.com"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist()).andExpect(jsonPath("$.password").doesNotExist());
        assertEquals(1, jdbc.queryForObject("select count(*) from users where email = 'rayen@example.com'", Integer.class));
        AppUser stored = users.findByEmail("rayen@example.com").orElseThrow();
        assertEquals("Rayen", stored.getName());
        assertNotNull(stored.getCreatedAt());
        assertNotEquals("test-password-123", stored.getPasswordHash());
        assertTrue(passwords.matches("test-password-123", stored.getPasswordHash()));
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void duplicateEmailsAreRejectedByApiAndDatabase() throws Exception {
        customer();
        register("""
                {"name":"Someone", "email":" RAYEN@EXAMPLE.COM ", "password":"other-password-123"}
                """).andExpect(status().isConflict()).andExpect(jsonPath("$.errors.email").exists());
        assertThrows(DataIntegrityViolationException.class, () -> users.saveAndFlush(
                new AppUser("Duplicate", "rayen@example.com", passwords.encode("other-password-123"), Role.CLIENT)));
        assertEquals(1, users.count());
    }

    @Test
    void validatesNameEmailAndPasswordIncludingBcryptByteLimit() throws Exception {
        register("""
                {"name":" ", "email":"invalid", "password":"short"}
                """).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.email").exists()).andExpect(jsonPath("$.errors.password").exists());
        register("{\"name\":\"Test\",\"email\":\"test@example.com\",\"password\":\"" + "é".repeat(40) + "\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.password").exists());
        assertEquals(0, users.count());
    }

    private MvcResult csrfToken(MockHttpSession session) throws Exception {
        return mvc.perform(get("/api/auth/csrf").session(session)).andExpect(status().isOk()).andReturn();
    }

    @Test
    void realCsrfSessionLoginRestoreClientDenialAndLogout() throws Exception {
        customer();
        MockHttpSession session = new MockHttpSession();
        String token = JsonPath.read(csrfToken(session).getResponse().getContentAsString(), "$.token");
        String originalId = session.getId();
        mvc.perform(post("/api/auth/login").session(session).header("X-CSRF-TOKEN", token)
                .param("email", " RAYEN@EXAMPLE.COM ").param("password", "test-password-123"))
                .andExpect(status().isOk());
        assertNotEquals(originalId, session.getId());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Rayen")).andExpect(jsonPath("$.role").value("CLIENT"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
        mvc.perform(get("/api/admin/dashboard").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout").session(session)).andExpect(status().isForbidden());
        // Login rotates the CSRF token. Reusing the pre-login token must fail.
        mvc.perform(post("/api/auth/logout").session(session).header("X-CSRF-TOKEN", token)).andExpect(status().isForbidden());
        String logoutToken = JsonPath.read(csrfToken(session).getResponse().getContentAsString(), "$.token");
        mvc.perform(post("/api/auth/logout").session(session).header("X-CSRF-TOKEN", logoutToken)).andExpect(status().isOk());
        assertTrue(session.isInvalid());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void wrongAndUnknownCredentialsUseSameGenericMessage() throws Exception {
        customer();
        for (String email : new String[]{"rayen@example.com", "unknown@example.com"}) {
            mvc.perform(post("/api/auth/login").with(csrf()).param("email", email).param("password", "wrong-password"))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Incorrect email or password."));
        }
    }

    @Test
    void csrfRequiredAndMenuRemainsPublic() throws Exception {
        mvc.perform(post("/api/auth/register").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/login").param("email", "x@example.com").param("password", "anything"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/dishes")).andExpect(status().isOk());
        mvc.perform(get("/api/admin/dashboard")).andExpect(status().isUnauthorized());
    }

    @Test
    void realAdminLoginCanAccessDashboard() throws Exception {
        users.saveAndFlush(new AppUser("Owner", "owner@example.com", passwords.encode("owner-test-password"), Role.ADMIN));
        MvcResult login = mvc.perform(post("/api/auth/login").with(csrf())
                .param("email", "owner@example.com").param("password", "owner-test-password"))
                .andExpect(status().isOk()).andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        mvc.perform(get("/api/admin/dashboard").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(jsonPath("$.role").value("ADMIN"));
    }
}
