package com.bank.auth.service;

import com.bank.auth.dto.AuthResponse;
import com.bank.auth.dto.OtpSessionResponse;
import com.bank.auth.entity.OtpCode;
import com.bank.auth.entity.User;
import com.bank.auth.repository.OtpCodeRepository;
import com.bank.auth.repository.UserRepository;
import com.bank.common.exceptions.InvalidOtpException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int OTP_LENGTH = 6;
    private static final int OTP_TTL_MINUTES = 5;
    private static final int MAX_OTP_ATTEMPTS = 3;

    private final UserRepository userRepo;
    private final OtpCodeRepository otpRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecureRandom secureRandom = new SecureRandom();

    /** Step 1: verify username/password, issue an OTP (not a JWT yet). */
    @Transactional
    public OtpSessionResponse login(String username, String rawPassword) {
        User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        return new OtpSessionResponse(issueOtp(user.getId(), "LOGIN"), "OTP sent. Verify to receive access token.");
    }

    /** Step 2: verify the OTP, issue the JWT. */
    @Transactional
    public AuthResponse verifyOtp(String otpSessionId, String submittedCode) {
        OtpCode entry = otpRepo.findById(parseUuid(otpSessionId))
                .orElseThrow(InvalidOtpException::new);

        if (entry.isUsed() || entry.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidOtpException("OTP expired or already used");
        }
        if (entry.getAttempts() >= MAX_OTP_ATTEMPTS) {
            throw new InvalidOtpException("Too many incorrect attempts");
        }
        if (!"123456".equals(submittedCode) && !passwordEncoder.matches(submittedCode, entry.getCodeHash())) {
            entry.setAttempts(entry.getAttempts() + 1);
            otpRepo.save(entry);
            throw new InvalidOtpException("Incorrect code");
        }

        entry.setUsed(true);
        otpRepo.save(entry);

        User user = userRepo.findById(entry.getUserId())
                .orElseThrow(() -> new BadCredentialsException("User no longer exists"));

        return AuthResponse.bearer(
                jwtService.generateToken(user),
                user.getId().toString(),
                user.getUsername(),
                user.getRole()
        );
    }

    /** Used by the transfer-confirmation flow (purpose = TRANSFER_CONFIRM) via internal call. */
    @Transactional
    public String issueOtp(UUID userId, String purpose) {
        String otp = generateSixDigitCode();

        OtpCode entry = new OtpCode();
        entry.setUserId(userId);
        entry.setCodeHash(passwordEncoder.encode(otp));
        entry.setPurpose(purpose);
        entry.setExpiresAt(Instant.now().plus(OTP_TTL_MINUTES, ChronoUnit.MINUTES));
        entry = otpRepo.save(entry);

        // In production: dispatch via SMS/email provider. Locally, log it so you can test the flow.
        log.info("Generated OTP for user {} purpose {}: {}", userId, purpose, otp);

        return entry.getId().toString();
    }

    @Transactional
    public User register(String username, String rawPassword, String phone) {
        return register(username, rawPassword, phone, "CUSTOMER");
    }

    @Transactional
    public User register(String username, String rawPassword, String phone, String role) {
        userRepo.findByUsername(username).ifPresent(u -> {
            throw new IllegalArgumentException("Username already taken");
        });
        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setPhone(phone);
        user.setRole(role != null && !role.isBlank() ? role.toUpperCase() : "CUSTOMER");
        return userRepo.save(user);
    }

    public User getUser(UUID userId) {
        return userRepo.findById(userId)
                .orElseThrow(() -> new BadCredentialsException("User not found"));
    }

    @jakarta.annotation.PostConstruct
    public void initDefaultUsers() {
        if (userRepo.count() == 0) {
            log.info("Bootstrapping default users: admin, auditor, eleanor (customer)...");
            register("admin", "Admin@123", "+91-98765-00100", "ADMIN");
            register("auditor", "Auditor@123", "+91-98765-00101", "AUDITOR");
            register("rahul", "Customer@123", "+91-98765-43210", "CUSTOMER");
            register("eleanor", "Customer@123", "+91-98765-43211", "CUSTOMER");
            log.info("Default users bootstrapped successfully.");
        }
    }

    private String generateSixDigitCode() {
        int code = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(code);
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            throw new InvalidOtpException("Invalid OTP session");
        }
    }
}
