package com.sweetbyte.eats.ui.dto;

//POST /api/auth/register/customer
//email and Supabase id are NOT here: they come from the verified JWT, so they can't be faked
// no delivery address: the customer picks one per order at checkout
public record CustomerRegisterRequest(String name) {
}
