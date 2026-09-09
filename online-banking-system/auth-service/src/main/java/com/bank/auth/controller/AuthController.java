package com.bank.auth.controller;

import com.bank.auth.dto.AuthResponse;
import com.bank.auth.dto.OtpSessionResponse;
import com.bank.auth.service.AuthService;
import com.bank.common.dto.request.LoginRequest;
import com.bank.common.dto.request.OtpVerifyRequest;
import com.bank.common.dto.request.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Void> register(@RequestBody(required = false) RegisterRequest body,
                                         @RequestParam(name = "username", required = false) String username,
                                         @RequestParam(name = "password", required = false) String password,
                                         @RequestParam(name = "phone", required = false) String phone,
                                         @RequestParam(name = "role", required = false) String role) {
        String u = body != null ? body.username() : username;
        String p = body != null ? body.password() : password;
        String ph = body != null ? body.phone() : phone;
        String r = body != null ? body.role() : role;
        authService.register(u, p, ph, r);
        return ResponseEntity.status(201).build();
    }

    /** Step 1: username/password -> OTP session id. */
    @PostMapping("/login")
    public ResponseEntity<OtpSessionResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req.username(), req.password()));
    }

    /** Step 2: OTP session id + code -> JWT. */
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest req) {
        return ResponseEntity.ok(authService.verifyOtp(req.otpSessionId(), req.code()));
    }
}
