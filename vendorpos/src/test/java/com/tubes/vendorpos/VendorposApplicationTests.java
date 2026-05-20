package com.tubes.vendorpos;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootTest
class VendorposApplicationTests {

	@Test
	void contextLoads() {
		BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
		String hash = "$2a$10$4TZdITIM3AnJJQcE3kLle.FSDYDvKi8UaZfuC3zY28U3MBQHv3snq";
		System.out.println(">>> Matches: " + encoder.matches("secure123", hash));
	}

}
