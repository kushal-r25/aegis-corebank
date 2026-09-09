package com.bank.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/**
 * Validates the JWT issued by auth-service on every request into account-service /
 * transaction-service. Stateless — no session, no call back to auth-service per request
 * (the signing secret is shared via config, which is the standard tradeoff for
 * microservice JWT validation without a network hop per call).
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Value("${jwt.secret}")
    private String secret;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims claims = Jwts.parser()
                        .verifyWith(getSigningKey())
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();

                String userId = claims.getSubject();
                String role = claims.get("role", String.class);
                java.util.List<org.springframework.security.core.GrantedAuthority> authorities = new java.util.ArrayList<>();
                if (role != null && !role.isBlank()) {
                    String cleanRole = role.toUpperCase();
                    authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + cleanRole));
                    authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority(cleanRole));
                }
                var authToken = new UsernamePasswordAuthenticationToken(
                        userId, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authToken);
            } catch (JwtException | IllegalArgumentException ex) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
