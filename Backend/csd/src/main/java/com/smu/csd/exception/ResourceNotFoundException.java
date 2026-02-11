package com.smu.csd.exception;

public class ResourceNotFoundException extends Exception {
    public ResourceNotFoundException(String resource, String field, Object value) {
        super(String.format("%s not found with %s: %s", resource, field, value));
    }
}
