package com.example.orderservice;

import java.math.BigDecimal;

record OrderRecord(
    String orderId,
    String customerId,
    BigDecimal totalAmount,
    String currency
) {
}
