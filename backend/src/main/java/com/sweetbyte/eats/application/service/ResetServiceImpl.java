package com.sweetbyte.eats.application.service;

import java.io.IOException;
import java.io.UncheckedIOException;

import org.springframework.stereotype.Service;

import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.exceptions.PermissionDeniedException;
import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.repository.seed.SeedDataLoader;

// Only the operator may restore the initial state (Appendix A: "Restore the initial system state").
// The seed file (seed/seed.json) is the single source of the initial state, at startup and on reset.
@Service
public class ResetServiceImpl implements ResetService {

    private final SeedDataLoader seedDataLoader;

    public ResetServiceImpl(SeedDataLoader seedDataLoader) {
        this.seedDataLoader = seedDataLoader;
    }

    @Override
    public void resetSystem(User user) {
        if (!user.hasRole(Role.OPERATOR)) {
            throw new PermissionDeniedException("Only an operator can reset the system");
        }
        try {
            seedDataLoader.resetToSeed();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the seed configuration file", e);
        }
    }
}
