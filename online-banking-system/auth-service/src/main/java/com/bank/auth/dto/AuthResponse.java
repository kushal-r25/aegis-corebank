package com.bank.auth.dto;

public record AuthResponse(
        String token,
        String tokenType,
        String userId,
        String username,
        String role
) {
    public static AuthResponse bearer(String token, String userId, String username, String role) {
        return new AuthResponse(token, "Bearer", userId, username, role);
    }

    public static AuthResponse bearer(String token) {
        return new AuthResponse(token, "Bearer", null, null, null);
    }
}

