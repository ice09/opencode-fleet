package com.example.customerservice;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/customers")
class CustomerController {

    private final CustomerDirectory customerDirectory;

    CustomerController(CustomerDirectory customerDirectory) {
        this.customerDirectory = customerDirectory;
    }

    @GetMapping("/{customerId}")
    CustomerProfile getCustomer(@PathVariable String customerId) {
        return customerDirectory.findById(customerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown customer: " + customerId));
    }
}
