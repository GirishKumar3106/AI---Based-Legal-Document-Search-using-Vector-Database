package com.legalsearch.legal_search_backend.controller;

import com.legalsearch.legal_search_backend.service.FastApiService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "http://localhost:5173")
public class DocumentController {

    private final FastApiService fastApiService;

    public DocumentController(FastApiService fastApiService) {
        this.fastApiService = fastApiService;
    }

    @PostMapping(
            value = "/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public Object uploadDocument(
            @RequestParam("file") MultipartFile file
    ) {

        if (file.isEmpty()) {
            throw new IllegalArgumentException(
                    "Uploaded file is empty."
            );
        }

        if (file.getOriginalFilename() == null ||
            !file.getOriginalFilename().toLowerCase().endsWith(".pdf")) {

            throw new IllegalArgumentException(
                    "Only PDF files are supported."
            );
        }

        return fastApiService.uploadDocument(file);
    }
}