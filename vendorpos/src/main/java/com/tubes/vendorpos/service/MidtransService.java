package com.tubes.vendorpos.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tubes.vendorpos.entity.Transaction;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class MidtransService {

    @Value("${midtrans.server-key}")
    private String serverKey;

    @Value("${midtrans.is-production}")
    private boolean isProduction;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    private String getSnapBaseUrl() {
        return isProduction 
            ? "https://app.midtrans.com/snap/v1" 
            : "https://app.sandbox.midtrans.com/snap/v1";
    }

    private String getApiBaseUrl() {
        return isProduction 
            ? "https://api.midtrans.com/v2" 
            : "https://api.sandbox.midtrans.com/v2";
    }

    private String getAuthHeader() {
        String auth = serverKey + ":";
        return "Basic " + Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
    }

    public String createSnapToken(Transaction tx) throws Exception {
        String url = getSnapBaseUrl() + "/transactions";

        ObjectNode transactionDetails = objectMapper.createObjectNode();
        transactionDetails.put("order_id", tx.getReceiptNumber());
        transactionDetails.put("gross_amount", tx.getAmount().longValue());

        ObjectNode creditCard = objectMapper.createObjectNode();
        creditCard.put("secure", true);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.set("transaction_details", transactionDetails);
        payload.set("credit_card", creditCard);

        String jsonPayload = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("Authorization", getAuthHeader())
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200 || response.statusCode() == 201) {
            ObjectNode responseNode = (ObjectNode) objectMapper.readTree(response.body());
            return responseNode.get("token").asText();
        } else {
            throw new RuntimeException("Failed to get Snap token from Midtrans: " + response.body());
        }
    }

    public Map<String, Object> getTransactionStatus(String receiptNumber) throws Exception {
        String url = getApiBaseUrl() + "/" + receiptNumber + "/status";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .header("Authorization", getAuthHeader())
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            return objectMapper.readValue(response.body(), HashMap.class);
        } else {
            throw new RuntimeException("Failed to get transaction status from Midtrans: " + response.body());
        }
    }

    public boolean verifySignature(Map<String, Object> payload) {
        try {
            String orderId = (String) payload.get("order_id");
            String statusCode = (String) payload.get("status_code");
            String signatureKey = (String) payload.get("signature_key");
            
            String grossAmount = "";
            Object rawAmount = payload.get("gross_amount");
            if (rawAmount instanceof Number) {
                grossAmount = String.format(java.util.Locale.US, "%.2f", ((Number) rawAmount).doubleValue());
            } else if (rawAmount != null) {
                grossAmount = String.valueOf(rawAmount);
            }
            
            System.out.println("Verifying Midtrans signature: orderId=" + orderId + ", statusCode=" + statusCode + ", grossAmount=" + grossAmount);
            
            String raw = orderId + statusCode + grossAmount + serverKey;
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-512");
            byte[] digest = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            String computed = sb.toString();
            return computed.equalsIgnoreCase(signatureKey);
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public String getServerKey() {
        return serverKey;
    }
}
