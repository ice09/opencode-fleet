package com.example.orderservice;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Component
class CustomerServiceClient {

    private final RestClient restClient;

    CustomerServiceClient(RestClient.Builder builder, @Value("${customer.service.base-url}") String customerServiceBaseUrl) {
        this.restClient = builder.baseUrl(customerServiceBaseUrl).build();
    }

    CustomerProfile getCustomer(String customerId) {
        try {
            CustomerProfile customer = restClient.get()
                .uri("/customers/{customerId}", customerId)
                .retrieve()
                .body(CustomerProfile.class);

            if (customer == null) {
                throw new ResponseStatusException(BAD_GATEWAY, "Customer service returned an empty response");
            }

            return customer;
        } catch (RestClientResponseException exception) {
            throw new ResponseStatusException(
                BAD_GATEWAY,
                "Customer service request failed with status " + exception.getStatusCode(),
                exception
            );
        }
    }
}
