package com.sweetbyte.eats.ui.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import
        org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.model.User;
import com.sweetbyte.eats.application.service.AuthService;
import com.sweetbyte.eats.application.service.LedgerService;
import com.sweetbyte.eats.application.service.OrderSummaryService;
import com.sweetbyte.eats.ui.dto.FareResponse;
import com.sweetbyte.eats.ui.dto.LedgerEntryResponse;
import com.sweetbyte.eats.ui.dto.OrderSummaryResponse;
import com.sweetbyte.eats.ui.dto.RefundRequest;

@RestController
@RequestMapping("/api")
// PRC endpoints: fare, order summary, refund, ledger history
public class BillingController {

    private final OrderSummaryService orderSummaryService;
    private final LedgerService ledgerService;
    private final AuthService authService;

    public BillingController(OrderSummaryService orderSummaryService,
                             LedgerService ledgerService,
                             AuthService authService) {
        this.orderSummaryService = orderSummaryService;
        this.ledgerService = ledgerService;
        this.authService = authService;
    }


    @GetMapping("/orders/{id}/fare")
    public FareResponse getFare(@AuthenticationPrincipal Jwt jwt,
                                @PathVariable Long id) {
        return FareResponse.from(orderSummaryService.getFare(id,
                currentUser(jwt)));
    }


    @GetMapping("/orders/{id}/summary")
    public OrderSummaryResponse getSummary(@AuthenticationPrincipal Jwt
                                                   jwt, @PathVariable Long id) {
        return
                OrderSummaryResponse.from(orderSummaryService.getSummary(id,
                        currentUser(jwt)));
    }


    @PostMapping("/orders/{id}/refund")
    @ResponseStatus(HttpStatus.CREATED)
    public LedgerEntryResponse refund(@AuthenticationPrincipal Jwt jwt,
                                      @PathVariable Long id,
                                      @RequestBody RefundRequest body) {
        return LedgerEntryResponse.from(ledgerService.refund(id,
                body.reason(), currentUser(jwt)));
    }


    @GetMapping("/ledger")
    public List<LedgerEntryResponse> getHistory(@AuthenticationPrincipal
                                                Jwt jwt) {
        return ledgerService.history(currentUser(jwt)).stream()
                .map(LedgerEntryResponse::from)
                .toList();
    }

    private User currentUser(Jwt jwt) {
        return authService.currentUser(UUID.fromString(jwt.getSubject()));
    }
}