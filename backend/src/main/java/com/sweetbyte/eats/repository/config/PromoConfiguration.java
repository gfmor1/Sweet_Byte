package com.sweetbyte.eats.repository.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.sweetbyte.eats.application.model.PromoConfig;

//Reads the promo codes from the configuration file (R-PROMO-02 values)
//No default codes on purpose, if the property is missing, app fails instead
//of silently accepting no promotion

@Configuration
public class PromoConfiguration {

    @Bean
    public PromoConfig promoConfig(@Value("${promo.codes}") String codes) {
        return PromoConfig.parse(codes);
    }
}