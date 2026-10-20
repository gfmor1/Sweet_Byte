package com.sweetbyte.eats.application.service;

import java.util.UUID;

import com.sweetbyte.eats.application.model.User;

// Resolves who is acting on a request.
// The JWT is already verified by Spring Security; its "sub" is the Supabase account id.
public interface AuthService {
    User currentUser(UUID supabaseUid);
}
