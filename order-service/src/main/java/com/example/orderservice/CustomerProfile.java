package com.example.orderservice;

public record CustomerProfile(
    String customerId,
    String displayName,
    String customerSegment,
    String accountManager
) {
}
