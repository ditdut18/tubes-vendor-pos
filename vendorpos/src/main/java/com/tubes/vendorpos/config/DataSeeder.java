package com.tubes.vendorpos.config;

import com.tubes.vendorpos.entity.User;
import com.tubes.vendorpos.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Optional;

@Configuration
public class DataSeeder {

    @Bean
    public CommandLineRunner loadData(UserRepository userRepository) {
        return args -> {
            // Cek dan update/insert Admin
            Optional<User> adminOpt = userRepository.findByUsername("admin");
            if (adminOpt.isEmpty()) {
                userRepository.save(new User("admin", "secure123", "ADMIN"));
            } else {
                User admin = adminOpt.get();
                if (admin.getRole() == null || admin.getRole().isEmpty()) {
                    admin.setRole("ADMIN");
                    userRepository.save(admin);
                }
            }

            // Cek dan insert User biasa
            if (userRepository.findByUsername("user").isEmpty()) {
                userRepository.save(new User("user", "user123", "USER"));
            }

            System.out.println("==================================================");
            System.out.println("Akun Kredensial telah dicek dan siap di DB:");
            System.out.println("1. admin / secure123 (Role: ADMIN)");
            System.out.println("2. user / user123 (Role: USER)");
            System.out.println("==================================================");
        };
    }
}
