package com.sweetbyte.eats.ui.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

// Verifies Supabase JWTs (Authorization: Bearer <token>) on every request.
// Signature is checked against Supabase's public keys (JWKS), plus expiry, issuer and audience;
// see spring.security.oauth2.resourceserver.jwt.* in application.properties.
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                 // no cookies/sessions, token in a header
            .cors(Customizer.withDefaults())              // uses the CorsConfigurationSource bean
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()   // CORS preflight
                // the preparation queue is restaurant-internal (owner / operator only)
                .requestMatchers(HttpMethod.GET, "/api/restaurants/*/queue", "/api/restaurants/*/queue/size").authenticated()
                // public browsing: restaurants, menus, enum lists
                .requestMatchers(HttpMethod.GET, "/api/restaurants/**", "/api/enums").permitAll()
                // everything else needs a valid token: these endpoints act as the logged-in user
                // (they read the JWT's sub), so an anonymous request must not reach them
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
