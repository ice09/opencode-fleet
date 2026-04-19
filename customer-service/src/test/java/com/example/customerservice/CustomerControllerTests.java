package com.example.customerservice;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class CustomerControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsKnownCustomer() throws Exception {
        mockMvc.perform(get("/customers/CUST-100"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.customerId").value("CUST-100"))
            .andExpect(jsonPath("$.displayName").value("Acme Industrial"))
            .andExpect(jsonPath("$.customerSegment").value("enterprise"))
            .andExpect(jsonPath("$.accountManager").value("Nina Patel"));
    }

    @Test
    void returnsNotFoundForUnknownCustomer() throws Exception {
        mockMvc.perform(get("/customers/CUST-999"))
            .andExpect(status().isNotFound());
    }
}
