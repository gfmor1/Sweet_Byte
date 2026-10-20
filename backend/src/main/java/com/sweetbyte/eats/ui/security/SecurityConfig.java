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
                // need a valid token: these endpoints act as the logged-in user (they read the JWT's sub),
                // so without .authenticated() an anonymous request would reach them with no user
                .requestMatchers("/api/orders/**", "/api/auth/**").authenticated()
                // TODO: restaurant/menu write endpoints still have no checks
                .anyRequest().permitAll())
            .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
