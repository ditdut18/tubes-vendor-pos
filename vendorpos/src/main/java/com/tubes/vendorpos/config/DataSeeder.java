package com.tubes.vendorpos.config;

import com.tubes.vendorpos.entity.User;
import com.tubes.vendorpos.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

@Configuration
public class DataSeeder {

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner loadData(UserRepository userRepository) {
        return args -> {
            Optional<User> adminOpt = userRepository.findByUsername("admin");
            if (adminOpt.isEmpty()) {
                userRepository.save(new User("admin", passwordEncoder.encode("secure123"), "ADMIN"));
            } else {
                User admin = adminOpt.get();
                if (!admin.getPassword().startsWith("$2")) {
                    admin.setPassword(passwordEncoder.encode("secure123"));
                }
                if (admin.getRole() == null || admin.getRole().isEmpty()) {
                    admin.setRole("ADMIN");
                }
                userRepository.save(admin);
            }

            Optional<User> userOpt = userRepository.findByUsername("user");
            if (userOpt.isEmpty()) {
                userRepository.save(new User("user", passwordEncoder.encode("user123"), "USER"));
            } else {
                User user = userOpt.get();
                if (!user.getPassword().startsWith("$2")) {
                    user.setPassword(passwordEncoder.encode("user123"));
                    userRepository.save(user);
                }
            }

            System.out.println("==================================================");
            System.out.println("Akun Kredensial telah dicek dan siap di DB:");
            System.out.println("1. admin / secure123 (Role: ADMIN)");
            System.out.println("2. user / user123 (Role: USER)");
            System.out.println("==================================================");
        };
    }
}
