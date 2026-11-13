package com.sweetbyte.eats.ui.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.service.AuthService;
import com.sweetbyte.eats.application.service.DispatchService;
import com.sweetbyte.eats.application.service.ResetService;
import com.sweetbyte.eats.ui.dto.OperatorDashboardResponse;

// Operator dashboard: every restaurant and order, with the stalled flag. No business logic here.
@RestController
@RequestMapping("/api/operator")
public class OperatorController {

    private final DispatchService dispatchService;
    private final AuthService authService;
    private final ResetService resetService;

    public OperatorController(DispatchService dispatchService, AuthService authService, ResetService resetService) {
        this.dispatchService = dispatchService;
        this.authService = authService;
        this.resetService = resetService;
    }

    // GET /api/operator/dashboard
    @GetMapping("/dashboard")
    public OperatorDashboardResponse dashboard(@AuthenticationPrincipal Jwt jwt) {
        return OperatorDashboardResponse.from(dispatchService.getOverview(currentUser(jwt)));
    }

    // POST /api/operator/reset: restore the initial state from the seed configuration file
    @PostMapping("/reset")
    public ResponseEntity<Void> reset(@AuthenticationPrincipal Jwt jwt) {
        resetService.resetSystem(currentUser(jwt));
        return ResponseEntity.noContent().build();
    }

    private User currentUser(Jwt jwt) {
        return authService.currentUser(UUID.fromString(jwt.getSubject()));
    }
}
