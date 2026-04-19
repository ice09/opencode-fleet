package com.example.customerservice;

public record CustomerProfile(
    String customerId,
    String displayName,
    String customerSegment,
    String accountManager
) {
}
