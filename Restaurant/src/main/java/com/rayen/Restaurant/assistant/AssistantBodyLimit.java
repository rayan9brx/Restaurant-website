package com.rayen.Restaurant.assistant;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.*;
import java.nio.charset.StandardCharsets;

@Component
public class AssistantBodyLimit extends OncePerRequestFilter {
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getMethod().equals("POST") || !request.getRequestURI().equals(request.getContextPath() + "/api/menu-assistant/chat");
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader("Cache-Control", "no-store");
        byte[] body = request.getInputStream().readNBytes(36001);
        if (body.length > 36000) {
            response.setStatus(413);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"The assistant request is too large. Clear the conversation and try again.\"}");
            return;
        }
        chain.doFilter(new HttpServletRequestWrapper(request) {
            @Override public ServletInputStream getInputStream() {
                var stream = new ByteArrayInputStream(body);
                return new ServletInputStream() {
                    public int read() { return stream.read(); }
                    public boolean isFinished() { return stream.available() == 0; }
                    public boolean isReady() { return true; }
                    public void setReadListener(ReadListener listener) { throw new UnsupportedOperationException(); }
                };
            }
            @Override public BufferedReader getReader() {
                return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
            }
        }, response);
    }
}
