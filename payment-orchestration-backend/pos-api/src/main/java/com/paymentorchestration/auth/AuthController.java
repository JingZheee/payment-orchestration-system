package com.paymentorchestration.auth;

import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.exception.PosException;
import com.paymentorchestration.domain.entity.User;
import com.paymentorchestration.domain.repository.UserRepository;
import com.paymentorchestration.security.JwtTokenProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<LoginResponse>> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new PosException("Email already in use", HttpStatus.CONFLICT);
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        userRepository.save(user);

        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail(), user.getRole());
        String refreshToken = jwtTokenProvider.generateRefreshToken();

        user.setRefreshToken(refreshToken);
        user.setTokenExpiresAt(Instant.now().plusSeconds(604800));
        userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(new LoginResponse(accessToken, refreshToken, user.getRole())));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new PosException("Invalid email or password", HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new PosException("Invalid email or password", HttpStatus.UNAUTHORIZED);
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail(), user.getRole());
        String refreshToken = jwtTokenProvider.generateRefreshToken();

        user.setRefreshToken(refreshToken);
        user.setTokenExpiresAt(Instant.now().plusSeconds(604800)); // 7 days
        userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.ok(new LoginResponse(accessToken, refreshToken, user.getRole())));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        User user = userRepository.findByRefreshToken(request.refreshToken())
                .orElseThrow(() -> new PosException("Invalid refresh token", HttpStatus.UNAUTHORIZED));

        if (user.getTokenExpiresAt() == null || user.getTokenExpiresAt().isBefore(Instant.now())) {
            throw new PosException("Refresh token expired", HttpStatus.UNAUTHORIZED);
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail(), user.getRole());

        return ResponseEntity.ok(ApiResponse.ok(
                new LoginResponse(accessToken, request.refreshToken(), user.getRole())));
    }
}
