package com.example.orderservice;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CustomerServiceClient customerServiceClient;

    @Test
    void returnsCombinedOrderSummary() throws Exception {
        given(customerServiceClient.getCustomer("CUST-100"))
            .willReturn(new CustomerProfile("CUST-100", "Acme Industrial", "enterprise", "Nina Patel"));

        mockMvc.perform(get("/orders/ORD-9001/summary"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.orderId").value("ORD-9001"))
            .andExpect(jsonPath("$.customerId").value("CUST-100"))
            .andExpect(jsonPath("$.totalAmount").value(12500))
            .andExpect(jsonPath("$.currency").value("USD"))
            .andExpect(jsonPath("$.customerDisplayName").value("Acme Industrial"))
            .andExpect(jsonPath("$.customerSegment").value("enterprise"))
            .andExpect(jsonPath("$.accountManager").value("Nina Patel"));
    }

    @Test
    void returnsNotFoundForUnknownOrder() throws Exception {
        mockMvc.perform(get("/orders/ORD-404/summary"))
            .andExpect(status().isNotFound());
    }
}
