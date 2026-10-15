package com.legalsearch.legal_search_backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
public class FastApiService {

    private final HttpClient httpClient;

    public FastApiService() {
        this.httpClient = HttpClient.newBuilder()
                .proxy(HttpClient.Builder.NO_PROXY)
                .version(HttpClient.Version.HTTP_1_1)
                .build();
    }

    public String search(String query) {

        String requestBody =
                "{\"query\":\"" + query.replace("\"", "\\\"") + "\",\"top_k\":5}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://127.0.0.1:8000/search"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        try {

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            if (response.statusCode() >= 200 &&
                response.statusCode() < 300) {

                return response.body();
            }

            throw new RuntimeException(
                    "FastAPI returned HTTP " +
                    response.statusCode() +
                    ": " +
                    response.body()
            );

        } catch (IOException e) {

            throw new RuntimeException(
                    "Could not connect to FastAPI: " + e.getMessage(),
                    e
            );

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "FastAPI request was interrupted.",
                    e
            );
        }
    }

    public String uploadDocument(MultipartFile file) {

        String boundary = "----JavaBoundary" + UUID.randomUUID();

        try {

            byte[] fileBytes = file.getBytes();

            ByteArrayOutputStream outputStream =
                    new ByteArrayOutputStream();

            String partHeader =
                    "--" + boundary + "\r\n" +
                    "Content-Disposition: form-data; name=\"file\"; filename=\"" +
                    file.getOriginalFilename() + "\"\r\n" +
                    "Content-Type: " +
                    (file.getContentType() != null
                            ? file.getContentType()
                            : "application/pdf") +
                    "\r\n\r\n";

            outputStream.write(
                    partHeader.getBytes(StandardCharsets.UTF_8)
            );

            outputStream.write(fileBytes);

            outputStream.write(
                    ("\r\n--" + boundary + "--\r\n")
                            .getBytes(StandardCharsets.UTF_8)
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(
                            "http://127.0.0.1:8000/documents/upload"
                    ))
                    .header(
                            "Content-Type",
                            "multipart/form-data; boundary=" + boundary
                    )
                    .POST(
                            HttpRequest.BodyPublishers.ofByteArray(
                                    outputStream.toByteArray()
                            )
                    )
                    .build();

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            if (response.statusCode() >= 200 &&
                response.statusCode() < 300) {

                return response.body();
            }

            throw new RuntimeException(
                    "FastAPI upload failed. HTTP " +
                    response.statusCode() +
                    ": " +
                    response.body()
            );

        } catch (IOException e) {

            throw new RuntimeException(
                    "Could not prepare/upload document: " +
                    e.getMessage(),
                    e
            );

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            throw new RuntimeException(
                    "Document upload was interrupted.",
                    e
            );
        }
    }
}