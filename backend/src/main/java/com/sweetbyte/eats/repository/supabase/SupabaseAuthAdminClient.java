package com.sweetbyte.eats.repository.supabase;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

//talks to the Supabase Auth Admin API (server-side only: uses the service-role key)
//used by the seeder to create the auth accounts of demo users
@Component
public class SupabaseAuthAdminClient {

    private static final int PAGE_SIZE = 1000;

    private final RestClient restClient;
    private final boolean configured;

    public SupabaseAuthAdminClient(@Value("${supabase.url}") String supabaseUrl,
                                   @Value("${supabase.service-role-key:}") String serviceRoleKey) {
        this.configured = !serviceRoleKey.isBlank();
        this.restClient = RestClient.builder()
                .baseUrl(supabaseUrl + "/auth/v1/admin")
                .defaultHeader("apikey", serviceRoleKey)
                .defaultHeader("Authorization", "Bearer " + serviceRoleKey)
                .build();
    }

    public boolean isConfigured() {
        return configured;
    }

    // Returns the Supabase id of the account with this email, creating it (pre-confirmed) if missing.
    public UUID ensureUser(String email, String password) {
        try {
            AdminUser created = restClient.post()
                    .uri("/users")
                    .body(Map.of("email", email, "password", password, "email_confirm", true))
                    .retrieve()
                    .body(AdminUser.class);
            return created.id();
        } catch (HttpClientErrorException e) {
            // 422 = an account with this email already exists (e.g. created by an earlier run)
            if (e.getStatusCode() != HttpStatus.UNPROCESSABLE_ENTITY) throw e;
            return findIdByEmail(email);
        }
    }

    private UUID findIdByEmail(String email) {
        for (int page = 1; ; page++) {
            AdminUserList list = restClient.get()
                    .uri("/users?page={page}&per_page={size}", page, PAGE_SIZE)
                    .retrieve()
                    .body(AdminUserList.class);
            if (list == null || list.users().isEmpty()) {
                throw new IllegalStateException("Supabase account not found for " + email);
            }
            for (AdminUser user : list.users()) {
                if (email.equalsIgnoreCase(user.email())) return user.id();
            }
        }
    }

    // only the fields we need from the Admin API responses
    private record AdminUser(UUID id, String email) {}

    private record AdminUserList(List<AdminUser> users) {}
}
