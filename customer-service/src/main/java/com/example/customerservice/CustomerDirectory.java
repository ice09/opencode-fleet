package com.example.customerservice;

import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
class CustomerDirectory {

    private static final Map<String, CustomerProfile> CUSTOMERS = Map.of(
        "CUST-100", new CustomerProfile("CUST-100", "Acme Industrial", "enterprise", "Nina Patel"),
        "CUST-200", new CustomerProfile("CUST-200", "Northwind Studio", "growth", "Sam Rivera"),
        "CUST-300", new CustomerProfile("CUST-300", "Blue Harbor Retail", "mid-market", "Jordan Lee")
    );

    Optional<CustomerProfile> findById(String customerId) {
        return Optional.ofNullable(CUSTOMERS.get(customerId));
    }
}
