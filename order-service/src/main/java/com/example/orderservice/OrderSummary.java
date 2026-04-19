package com.example.orderservice;

import java.math.BigDecimal;

public record OrderSummary(
    String orderId,
    String customerId,
    BigDecimal totalAmount,
    String currency,
    String customerDisplayName,
    String customerSegment,
    String accountManager
) {
}
