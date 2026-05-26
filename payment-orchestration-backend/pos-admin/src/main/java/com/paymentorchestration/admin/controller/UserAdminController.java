package com.paymentorchestration.admin.controller;

import com.paymentorchestration.common.dto.ApiResponse;
import com.paymentorchestration.common.enums.UserRole;
import com.paymentorchestration.common.exception.PosException;
import com.paymentorchestration.domain.entity.User;
import com.paymentorchestration.domain.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class UserAdminController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDto>>> getAll() {
        List<UserDto> users = userRepository.findAll().stream()
                .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .map(UserDto::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserDto>> create(@Valid @RequestBody CreateUserRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new PosException("Email already in use", HttpStatus.CONFLICT);
        }
        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(UserDto.from(userRepository.save(user))));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoleRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new PosException("User not found", HttpStatus.NOT_FOUND));
        user.setRole(request.role());
        return ResponseEntity.ok(ApiResponse.ok(UserDto.from(userRepository.save(user))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        if (!userRepository.existsById(id)) {
            throw new PosException("User not found", HttpStatus.NOT_FOUND);
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    record UserDto(UUID id, String email, UserRole role, Instant createdAt) {
        static UserDto from(User u) {
            return new UserDto(u.getId(), u.getEmail(), u.getRole(), u.getCreatedAt());
        }
    }

    record CreateUserRequest(
            @NotBlank @Email String email,
            @NotBlank String password,
            @NotNull UserRole role) {}

    record UpdateRoleRequest(@NotNull UserRole role) {}
}
