package com.tubes.vendorpos.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tubes.vendorpos.entity.RefreshToken;
import com.tubes.vendorpos.entity.User;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    void deleteByUser(User user);
}
