package com.sweetbyte.eats.ui.dto;

//POST /api/auth/register/customer (public: creates the account and logs in)
// no delivery address: the customer picks one per order at checkout
public record CustomerRegisterRequest(String email, String password, String name) {
}
