package com.sweetbyte.eats.application.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.persistence.UserRepository;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;

    public AuthServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // A valid Supabase token without a matching users row = logged in but never registered here
    @Override
    @Transactional(readOnly = true)
    public User currentUser(UUID supabaseUid) {
        return userRepository.findBySupabaseUid(supabaseUid)
            .orElseThrow(() -> new PermissionDeniedException("No SweetByte account for this login, register first"));
    }
}
