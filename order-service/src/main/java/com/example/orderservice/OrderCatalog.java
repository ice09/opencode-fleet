package com.example.orderservice;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
class OrderCatalog {

    private static final Map<String, OrderRecord> ORDERS = Map.of(
        "ORD-9001", new OrderRecord("ORD-9001", "CUST-100", BigDecimal.valueOf(12500), "USD"),
        "ORD-9002", new OrderRecord("ORD-9002", "CUST-200", BigDecimal.valueOf(3200), "EUR"),
        "ORD-9003", new OrderRecord("ORD-9003", "CUST-300", BigDecimal.valueOf(780), "GBP")
    );

    Optional<OrderRecord> findById(String orderId) {
        return Optional.ofNullable(ORDERS.get(orderId));
    }
}
