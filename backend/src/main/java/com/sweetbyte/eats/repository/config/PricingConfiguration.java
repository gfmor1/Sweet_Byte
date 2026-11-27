package com.sweetbyte.eats.repository.config;

import java.math.BigDecimal;

import com.sweetbyte.eats.application.model.PricingConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.sweetbyte.eats.application.pricing.DeliveryFeeDecorator;
import com.sweetbyte.eats.application.pricing.FareCalculator;
import com.sweetbyte.eats.application.pricing.ServiceFeeDecorator;
import com.sweetbyte.eats.application.pricing.SmallOrderSurchargeDecorator;
import com.sweetbyte.eats.application.pricing.SubtotalCalculator;

//Reads the pricing rules from configuration file
//No default pricing on purpose, if a value is missing, app fails instead
//of charging wrong price

@Configuration
public class PricingConfiguration {

    @Bean
    public PricingConfig pricingConfig(
            @Value("${pricing.delivery-fee}") BigDecimal deliveryFee,
            @Value("${pricing.service-fee}") BigDecimal serviceFee,
            @Value("${pricing.small-order-threshold}") BigDecimal smallOrderThreshold,
            @Value("${pricing.small-order-surcharge}") BigDecimal smallOrderSurcharge) {
        return new PricingConfig(deliveryFee, serviceFee, smallOrderThreshold, smallOrderSurcharge);
    }

    @Bean
    public FareCalculator fareCalculator(PricingConfig config) {
        return new SmallOrderSurchargeDecorator(
                new ServiceFeeDecorator(
                        new DeliveryFeeDecorator(new SubtotalCalculator(), config.getDeliveryFee()),
                        config.getServiceFee()),
                config.getSmallOrderThreshold(),
                config.getSmallOrderSurcharge());
    }
}
