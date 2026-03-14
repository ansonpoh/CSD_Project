package com.smu.csd.exception;

public class ResourceAlreadyExistsException extends Exception {
    public ResourceAlreadyExistsException(String resource, String field, Object value) {
        super(String.format("%s already exists with %s: %s", resource, field, value));
    }

    public ResourceAlreadyExistsException(String message) {
        super(message);
    }
}
