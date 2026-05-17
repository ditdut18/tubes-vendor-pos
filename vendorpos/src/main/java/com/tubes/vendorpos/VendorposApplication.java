package com.tubes.vendorpos;

import com.tubes.vendorpos.entity.Vendor;
import com.tubes.vendorpos.repository.VendorRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class VendorposApplication {

    public static void main(String[] args) {
        SpringApplication.run(VendorposApplication.class, args);
    }

    @Bean
    CommandLineRunner initData(VendorRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                Vendor v1 = new Vendor();
                v1.setNamaPerusahaan("Anxieties Lab");
                v1.setKontak("08123456789");
                v1.setAlamat("Bandung");
                v1.setStatusKerjasama("Aktif");
                repository.save(v1);
            }
        };
    }
}