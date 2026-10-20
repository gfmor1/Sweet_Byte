package com.sweetbyte.eats.ui.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sweetbyte.eats.application.service.EnumService;

//exposes the backend enums so the frontend never hardcodes the lists
@RestController
@RequestMapping("/api/enums")
public class EnumController {
    private final EnumService enumService;

    public EnumController(EnumService enumService) {
        this.enumService = enumService;
    }

    // GET /api/enums -> { "roles": ["CUSTOMER", ...], "orderStatuses": [...], ... }
    @GetMapping
    public Map<String, List<String>> enums() {
        return enumService.getAll();
    }
}
