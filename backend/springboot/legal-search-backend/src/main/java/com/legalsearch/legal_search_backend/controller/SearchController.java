package com.legalsearch.legal_search_backend.controller;

import com.legalsearch.legal_search_backend.service.FastApiService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class SearchController {

    private final FastApiService fastApiService;

    public SearchController(FastApiService fastApiService) {
        this.fastApiService = fastApiService;
    }

    @PostMapping("/search")
    public Object search(@RequestBody Map<String, String> request) {

        String query = request.get("query");

        return fastApiService.search(query);
    }
}