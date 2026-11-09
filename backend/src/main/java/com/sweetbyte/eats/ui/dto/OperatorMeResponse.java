package com.sweetbyte.eats.ui.dto;

import com.sweetbyte.eats.application.enums.Role;
import com.sweetbyte.eats.application.model.Operator;

public record OperatorMeResponse(Long userId, String name, String email, Role role) implements MeResponse {
    public static OperatorMeResponse from(Operator operator) {
        return new OperatorMeResponse(operator.getUserId(), operator.getName(), operator.getEmail(), operator.getRole());
    }
}
