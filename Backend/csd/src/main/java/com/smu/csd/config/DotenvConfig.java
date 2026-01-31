package com.smu.csd.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DotenvConfig {
    static {
        Dotenv dotenv = Dotenv.configure().directory("../").ignoreIfMissing().load();
        dotenv.entries().forEach(e -> {
            System.setProperty(e.getKey(), e.getValue());
        });
    }
}
