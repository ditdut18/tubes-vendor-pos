package com.tubes.vendorpos.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tubes.vendorpos.entity.Transaction;

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
        // Validasi eksplisit: server key tidak boleh kosong
        if (serverKey == null || serverKey.trim().isEmpty()) {
            throw new IllegalStateException(
                "Midtrans Server Key belum dikonfigurasi. " +
                "Set environment variable MIDTRANS_SERVER_KEY atau isi di application.properties."
            );
        }

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
            throw new RuntimeException("Midtrans API error (HTTP " + response.statusCode() + "): " + response.body());
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
            if (payload == null) return false;

            // Field names typically from Midtrans webhook
            String orderId = getAsString(payload, "order_id");
            String statusCode = getAsString(payload, "status_code");
            String signatureKey = getAsString(payload, "signature_key");

            // In some payloads gross_amount can be numeric or string.
            Object rawAmountObj = payload.get("gross_amount");
            String grossAmount = rawAmountObj == null ? "" : String.valueOf(rawAmountObj);

            if (isBlank(orderId) || isBlank(statusCode) || isBlank(signatureKey)) {
                System.out.println("Midtrans signature verify failed: missing fields. order_id=" + orderId + ", status_code=" + statusCode + ", signature_key=" + signatureKey);
                return false;
            }

            // Midtrans SHA512 raw string: order_id + status_code + gross_amount + server_key
            String raw = orderId + statusCode + grossAmount + serverKey;
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-512");
            byte[] digest = md.digest(raw.getBytes(StandardCharsets.UTF_8));

            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            String computed = sb.toString();

            boolean ok = computed.equalsIgnoreCase(signatureKey);
            if (!ok) {
                System.out.println("Midtrans signature verify failed. expected=" + signatureKey + ", computed=" + computed + ", raw=" + raw);
            }
            return ok;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private String getAsString(Map<String, Object> payload, String key) {
        Object v = payload.get(key);
        if (v == null) return null;
        return String.valueOf(v);
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    public String getServerKey() {
        return serverKey;
    }
}
