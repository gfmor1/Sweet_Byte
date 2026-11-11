package com.sweetbyte.eats.ui.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
import com.sweetbyte.eats.application.service.RefundRequestService;
import com.sweetbyte.eats.ui.dto.RefundRequestResponse;
import com.sweetbyte.eats.ui.dto.RefundVerdictRequest;
import com.sweetbyte.eats.ui.dto.SubmitRefundRequest;

@RestController
@RequestMapping("/api")
// Refund Request endpoints: customer submits, operator approves/rejects, every role views its own.
public class RefundRequestController {

    private final RefundRequestService refundRequestService;
    private final AuthService authService;

    public RefundRequestController(RefundRequestService refundRequestService, AuthService authService) {
        this.refundRequestService = refundRequestService;
        this.authService = authService;
    }

    // POST /api/orders/{id}/refund-request   body: { "reason": "..." }   (customer)
    @PostMapping("/orders/{id}/refund-request")
    @ResponseStatus(HttpStatus.CREATED)
    public RefundRequestResponse submit(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                        @RequestBody SubmitRefundRequest body) {
        return RefundRequestResponse.from(refundRequestService.submit(id, body.reason(), currentUser(jwt)));
    }

    // GET /api/orders/{id}/refund-request   (customer / restaurant / operator: see the verdict)
    @GetMapping("/orders/{id}/refund-request")
    public RefundRequestResponse getForOrder(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return RefundRequestResponse.from(refundRequestService.getForOrder(id, currentUser(jwt)));
    }

    // GET /api/refund-requests   (role-scoped: customer's own, restaurant dashboard, operator all)
    @GetMapping("/refund-requests")
    public List<RefundRequestResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return refundRequestService.list(currentUser(jwt)).stream().map(RefundRequestResponse::from).toList();
    }

    // GET /api/refund-requests/pending   (operator queue)
    @GetMapping("/refund-requests/pending")
    public List<RefundRequestResponse> pending(@AuthenticationPrincipal Jwt jwt) {
        return refundRequestService.pending(currentUser(jwt)).stream().map(RefundRequestResponse::from).toList();
    }

    // POST /api/refund-requests/{requestId}/approve   body: { "note": "..." } (optional)   (operator)
    @PostMapping("/refund-requests/{requestId}/approve")
    public RefundRequestResponse approve(@AuthenticationPrincipal Jwt jwt, @PathVariable Long requestId,
                                         @RequestBody(required = false) RefundVerdictRequest body) {
        String note = body == null ? null : body.note();
        return RefundRequestResponse.from(refundRequestService.approve(requestId, note, currentUser(jwt)));
    }

    // POST /api/refund-requests/{requestId}/reject   body: { "note": "..." } (required)   (operator)
    @PostMapping("/refund-requests/{requestId}/reject")
    public RefundRequestResponse reject(@AuthenticationPrincipal Jwt jwt, @PathVariable Long requestId,
                                        @RequestBody RefundVerdictRequest body) {
        return RefundRequestResponse.from(refundRequestService.reject(requestId, body.note(), currentUser(jwt)));
    }

    private User currentUser(Jwt jwt) {
        return authService.currentUser(UUID.fromString(jwt.getSubject()));
    }
}
