package com.example.orderservice;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/orders")
class OrderController {

    private final OrderCatalog orderCatalog;
    private final CustomerServiceClient customerServiceClient;

    OrderController(OrderCatalog orderCatalog, CustomerServiceClient customerServiceClient) {
        this.orderCatalog = orderCatalog;
        this.customerServiceClient = customerServiceClient;
    }

    @GetMapping("/{orderId}/summary")
    OrderSummary getOrderSummary(@PathVariable String orderId) {
        OrderRecord order = orderCatalog.findById(orderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown order: " + orderId));
        CustomerProfile customer = customerServiceClient.getCustomer(order.customerId());
        return new OrderSummary(
            order.orderId(),
            order.customerId(),
            order.totalAmount(),
            order.currency(),
            customer.displayName(),
            customer.customerSegment(),
            customer.accountManager()
        );
    }
}
