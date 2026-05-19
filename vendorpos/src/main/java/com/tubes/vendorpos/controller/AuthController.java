package com.tubes.vendorpos.controller;

import com.tubes.vendorpos.dto.LoginRequest;
import com.tubes.vendorpos.dto.LoginResponse;
import com.tubes.vendorpos.entity.User;
import com.tubes.vendorpos.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody LoginRequest request) {
        if (request.getUsername() == null || request.getUsername().trim().isEmpty() || 
            request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Username dan password tidak boleh kosong");
        }
        
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new LoginResponse("Username sudah terdaftar", null));
        }
        User user = new User(request.getUsername(), request.getPassword(), "USER");
        userRepository.save(user);
        return ResponseEntity.ok(new LoginResponse("Registrasi berhasil", "USER"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        if (userOpt.isPresent() && userOpt.get().getPassword().equals(request.getPassword())) {
            return ResponseEntity.ok(new LoginResponse("Login berhasil", userOpt.get().getRole()));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new LoginResponse("Username atau password salah", null));
    }
}
