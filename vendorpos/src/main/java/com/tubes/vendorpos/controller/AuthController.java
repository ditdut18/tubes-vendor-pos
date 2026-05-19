package com.tubes.vendorpos.controller;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tubes.vendorpos.config.JwtTokenUtil;
import com.tubes.vendorpos.dto.LoginRequest;
import com.tubes.vendorpos.dto.LoginResponse;
import com.tubes.vendorpos.entity.RefreshToken;
import com.tubes.vendorpos.entity.User;
import com.tubes.vendorpos.repository.RefreshTokenRepository;
import com.tubes.vendorpos.repository.UserRepository;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class AuthController {

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Value("${jwt.refresh.expiration:604800000}")
    private long refreshTokenExpirationMs;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody LoginRequest request) {
        if (request.getUsername() == null || request.getUsername().trim().isEmpty() || 
            request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Username dan password tidak boleh kosong");
        }

        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new LoginResponse("Username sudah terdaftar", null, null));
        }

        User user = new User(request.getUsername(), passwordEncoder.encode(request.getPassword()), "USER");
        userRepository.save(user);
        return ResponseEntity.ok(new LoginResponse("Registrasi berhasil", "USER", null));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        if (userOpt.isPresent() && passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            User user = userOpt.get();
            String token = jwtTokenUtil.generateToken(user.getUsername());
            String refreshTokenValue = UUID.randomUUID().toString();
            Instant expiryDate = Instant.now().plusMillis(refreshTokenExpirationMs);

            refreshTokenRepository.deleteByUser(user);
            refreshTokenRepository.save(new RefreshToken(refreshTokenValue, expiryDate, user));

            ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, Objects.requireNonNull(refreshTokenValue))
                    .httpOnly(true)
                    .secure(false)
                    .path("/")
                    .maxAge(refreshTokenExpirationMs / 1000)
                    .sameSite("Strict")
                    .build();

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(new LoginResponse("Login berhasil", user.getRole(), token));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new LoginResponse("Username atau password salah", null, null));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshTokenCookie) {
        if (refreshTokenCookie == null || refreshTokenCookie.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new LoginResponse("Refresh token tidak ditemukan", null, null));
        }

        Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByToken(refreshTokenCookie);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new LoginResponse("Refresh token tidak valid", null, null));
        }

        RefreshToken refreshToken = tokenOpt.get();
        if (refreshToken.isRevoked() || refreshToken.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(refreshToken);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new LoginResponse("Refresh token telah kedaluwarsa", null, null));
        }

        User user = refreshToken.getUser();
        String newToken = jwtTokenUtil.generateToken(user.getUsername());
        String newRefreshTokenValue = UUID.randomUUID().toString();
        Instant expiryDate = Instant.now().plusMillis(refreshTokenExpirationMs);

        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        RefreshToken newRefreshToken = new RefreshToken(newRefreshTokenValue, expiryDate, user);
        refreshTokenRepository.save(newRefreshToken);

        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, Objects.requireNonNull(newRefreshTokenValue))
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(refreshTokenExpirationMs / 1000)
                .sameSite("Strict")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new LoginResponse("Token diperbarui", user.getRole(), newToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshTokenCookie) {
        if (refreshTokenCookie != null && !refreshTokenCookie.isEmpty()) {
            refreshTokenRepository.findByToken(refreshTokenCookie).ifPresent(refreshTokenRepository::delete);
        }

        ResponseCookie deleteCookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
                .body("Logout berhasil");
    }
}
